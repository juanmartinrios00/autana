import { describe, expect, it } from 'vitest'
import { asService, newListing, newUser, rest, rpc, type TestUser } from './helpers'

/**
 * Las medallas del garage (026).
 *
 * `profile_badges` es `security definer`: adentro ve el WhatsApp y los avisos
 * vendidos, que nadie más puede leer. Lo que importa es que sólo devuelva la
 * lista de logros ganados, y que la devuelva igual para el dueño y para
 * cualquiera ---si un visitante viera menos medallas que el dueño, el garage
 * compartido mostraría algo distinto de lo que el dueño ve y parecería roto.
 */

async function badges(of: TestUser, token: string | null): Promise<string[]> {
  const answer = await rpc<string[]>('profile_badges', { target: of.id }, token)
  expect(answer.status).toBe(200)
  return answer.body ?? []
}

async function conFotos(owner: TestUser, listingId: string, count: number) {
  const rows = Array.from({ length: count }, (_, position) => ({
    listing_id: listingId,
    path: `${owner.id}/${listingId}/${position}.webp`,
    position,
  }))
  const answer = await rest('POST', 'listing_images', owner.token, rows)
  expect(answer.status).toBeLessThan(300)
}

describe('profile_badges', () => {
  it('una cuenta recién hecha no tiene ninguna', async () => {
    const user = await newUser('Recién')
    expect(await badges(user, user.token)).toEqual([])
  })

  it('el perfil completo pide nombre, WhatsApp y ubicación', async () => {
    const user = await newUser('Perfil')
    await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { city: 'Rosario' })
    expect(await badges(user, user.token)).toEqual([])

    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, {
      whatsapp: '11 2345 6789',
    })
    expect(answer.status).toBeLessThan(300)
    expect(await badges(user, user.token)).toEqual(['profile_complete'])
  })

  /* El caso que motivó ponerla en la base: el WhatsApp no se puede leer desde
     afuera (008) y los vendidos tampoco (022), así que calculadas en el
     navegador estas dos medallas no aparecerían nunca en el garage de nadie. */
  it('las que nadie puede calcular desde afuera se ven igual, y para cualquiera', async () => {
    const [owner, stranger] = await Promise.all([newUser('Dueño'), newUser('Otro')])
    await rest('PATCH', `profiles?id=eq.${owner.id}`, owner.token, {
      city: 'Rosario',
      whatsapp: '11 2345 6789',
    })
    const listing = await newListing(owner)
    await conFotos(owner, listing.id, 8)
    const vendido = await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, {
      status: 'sold',
    })
    expect(vendido.status).toBeLessThan(300)

    const esperadas = ['profile_complete', 'first_listing', 'rich_listing', 'first_sale']
    expect(await badges(owner, owner.token)).toEqual(esperadas)
    expect(await badges(owner, stranger.token)).toEqual(esperadas)
    expect(await badges(owner, null)).toEqual(esperadas)
  })

  it('tres activos y el garage lleno', async () => {
    const user = await newUser('Fierrero')
    await Promise.all([newListing(user), newListing(user), newListing(user)])
    for (const slot of ['first', 'current', 'dream', 'missed']) {
      const answer = await rest('POST', 'garage_entries', user.token, {
        user_id: user.id,
        slot,
        make: 'Renault',
        model: '12',
      })
      expect(answer.status).toBeLessThan(300)
    }

    expect(await badges(user, user.token)).toEqual([
      'first_listing',
      'three_listings',
      'garage_started',
      'garage_complete',
    ])
  })

  /* Devuelve booleanos y nada más: ni el número de teléfono, ni cuántos
     vendió, ni cuántas fotos tiene. */
  it('no filtra los datos con los que se calcula', async () => {
    const [owner, stranger] = await Promise.all([newUser('Dueño'), newUser('Otro')])
    await rest('PATCH', `profiles?id=eq.${owner.id}`, owner.token, {
      city: 'Rosario',
      whatsapp: '11 2345 6789',
    })

    const answer = await rpc<string[]>('profile_badges', { target: owner.id }, stranger.token)
    expect(JSON.stringify(answer.body)).not.toContain('2345')
    expect(answer.body).toEqual(['profile_complete'])
  })

  it('un perfil que no existe no rompe', async () => {
    const answer = await rpc<string[]>(
      'profile_badges',
      { target: '00000000-0000-0000-0000-000000000000' },
      null,
    )
    expect(answer.status).toBe(200)
    expect(answer.body).toEqual([])
  })

  /* Borrar un aviso baja el nivel: las medallas salen de los datos de ahora y
     no de un contador guardado. */
  it('si el dato desaparece, la medalla también', async () => {
    const user = await newUser('Borra')
    const listing = await newListing(user)
    expect(await badges(user, user.token)).toEqual(['first_listing'])

    const borrado = await asService('DELETE', `listings?id=eq.${listing.id}`)
    expect(borrado.status).toBeLessThan(300)
    expect(await badges(user, user.token)).toEqual([])
  })
})
