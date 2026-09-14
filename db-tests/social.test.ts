import { describe, expect, it } from 'vitest'
import { asService, newListing, newUser, rest, rpc } from './helpers'

/**
 * Buscar personas, seguir, bloquear y novedades (migraciones 011 a 016).
 */

interface Person {
  id: string
  name: string
}

interface Novedad {
  kind: string
  unseen: boolean
  actor_id: string | null
  actor_name: string | null
  listing_slug: string | null
  amount: number
}

/** Un nombre que no choca con los de otros tests, para buscarlo sin ruido. */
function uniqueName(prefix: string): string {
  return `${prefix} ${Math.random().toString(36).slice(2, 8)}`
}

describe('buscar personas', () => {
  it('encuentra por nombre sin importar acentos ni mayúsculas, también sin sesión', async () => {
    const name = uniqueName('Martín Núñez')
    const person = await newUser(name)
    const needle = name.split(' ')[2]!

    for (const term of [`martin nunez ${needle}`, `MARTÍN NÚÑEZ ${needle}`]) {
      const answer = await rpc<Person[]>('search_people', { term }, null)
      expect(answer.status, term).toBe(200)
      expect(answer.body.map((row) => row.id), term).toContain(person.id)
    }
  })

  it('los comodines de LIKE son letras, no "traeme todo"', async () => {
    const answer = await rpc<Person[]>('search_people', { term: '%%' }, null)
    expect(answer.body).toEqual([])
  })

  it('quien se sacó del buscador no aparece', async () => {
    const name = uniqueName('Oculta')
    const person = await newUser(name)
    await rest('PATCH', `profiles?id=eq.${person.id}`, person.token, { discoverable: false })

    const answer = await rpc<Person[]>('search_people', { term: name }, null)
    expect(answer.body.map((row) => row.id)).not.toContain(person.id)
  })
})

describe('seguir', () => {
  it('sigue, suma a la cantidad pública, y deja de seguir', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Ídolo')])

    const followed = await rest('POST', 'follows', fan.token, { follower_id: fan.id, followed_id: idol.id })
    expect(followed.status).toBeLessThan(300)

    const counts = await rpc<{ followers: number; following: number }[]>('follow_counts', { target: idol.id }, null)
    expect(counts.body[0]).toEqual({ followers: 1, following: 0 })

    await rest('DELETE', `follows?follower_id=eq.${fan.id}&followed_id=eq.${idol.id}`, fan.token)
    const after = await rpc<{ followers: number }[]>('follow_counts', { target: idol.id }, null)
    expect(after.body[0]?.followers).toBe(0)
  })

  it('no se puede seguir en nombre de otro', async () => {
    const [fan, other, idol] = await Promise.all([newUser(), newUser(), newUser()])
    const answer = await rest('POST', 'follows', fan.token, { follower_id: other.id, followed_id: idol.id })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  it('nadie ve a quién sigue otra persona', async () => {
    const [fan, idol, curious] = await Promise.all([newUser(), newUser(), newUser()])
    await rest('POST', 'follows', fan.token, { follower_id: fan.id, followed_id: idol.id })

    const answer = await rest<unknown[]>('GET', `follows?follower_id=eq.${fan.id}`, curious.token)
    expect(answer.body).toEqual([])
  })
})

describe('bloquear', () => {
  it('corta el seguimiento en las dos direcciones', async () => {
    const [a, b] = await Promise.all([newUser('A'), newUser('B')])
    await rest('POST', 'follows', a.token, { follower_id: a.id, followed_id: b.id })
    await rest('POST', 'follows', b.token, { follower_id: b.id, followed_id: a.id })

    await rest('POST', 'blocks', a.token, { blocker_id: a.id, blocked_id: b.id })

    const left = await asService<unknown[]>(
      'GET',
      `follows?or=(follower_id.eq.${a.id},followed_id.eq.${a.id})`,
    )
    expect(left.body).toEqual([])
  })

  it('el bloqueado no puede volver a seguir, y quien bloqueó tampoco', async () => {
    const [a, b] = await Promise.all([newUser(), newUser()])
    await rest('POST', 'blocks', a.token, { blocker_id: a.id, blocked_id: b.id })

    expect((await rest('POST', 'follows', b.token, { follower_id: b.id, followed_id: a.id })).status).toBeGreaterThanOrEqual(400)
    expect((await rest('POST', 'follows', a.token, { follower_id: a.id, followed_id: b.id })).status).toBeGreaterThanOrEqual(400)
  })

  it('no se aparecen en el buscador el uno al otro, pero sí para el resto y sin sesión', async () => {
    const nameA = uniqueName('Bloqueadora')
    const nameB = uniqueName('Bloqueado')
    const [a, b, third] = await Promise.all([newUser(nameA), newUser(nameB), newUser()])
    await rest('POST', 'blocks', a.token, { blocker_id: a.id, blocked_id: b.id })

    const ids = async (term: string, token: string | null) =>
      (await rpc<Person[]>('search_people', { term }, token)).body.map((row) => row.id)

    expect(await ids(nameA, b.token)).not.toContain(a.id)
    expect(await ids(nameB, a.token)).not.toContain(b.id)
    expect(await ids(nameA, third.token)).toContain(a.id)
    expect(await ids(nameA, null)).toContain(a.id)
  })

  it('el bloqueado no ve el bloqueo', async () => {
    const [a, b] = await Promise.all([newUser(), newUser()])
    await rest('POST', 'blocks', a.token, { blocker_id: a.id, blocked_id: b.id })

    const answer = await rest<unknown[]>('GET', `blocks?blocked_id=eq.${b.id}`, b.token)
    expect(answer.body).toEqual([])
  })
})

describe('novedades', () => {
  it('sin sesión no hay', async () => {
    expect((await rpc('my_novedades', {}, null)).status).toBeGreaterThanOrEqual(400)
  })

  it('interesados: la cantidad por aviso, sin decir quiénes', async () => {
    const seller = await newUser()
    const listing = await newListing(seller)
    const buyers = await Promise.all([newUser(), newUser()])
    for (const buyer of buyers) await rpc('express_interest', { p_slug: listing.slug }, buyer.token)

    const answer = await rpc<Novedad[]>('my_novedades', {}, seller.token)
    const interest = answer.body.find((item) => item.kind === 'interest')
    expect(interest).toMatchObject({ listing_slug: listing.slug, amount: 2, unseen: true })
    expect(interest?.actor_id).toBeNull()
    expect(interest?.actor_name).toBeNull()
  })

  it('seguidores: con nombre', async () => {
    const [fan, idol] = await Promise.all([newUser('Fanática'), newUser()])
    await rest('POST', 'follows', fan.token, { follower_id: fan.id, followed_id: idol.id })

    const answer = await rpc<Novedad[]>('my_novedades', {}, idol.token)
    expect(answer.body).toContainEqual(
      expect.objectContaining({ kind: 'follow', actor_id: fan.id, actor_name: 'Fanática' }),
    )
  })

  it('garages: sólo lo que cambió después de empezar a seguir', async () => {
    const [fan, idol] = await Promise.all([newUser(), newUser('Con garage')])
    const car = { user_id: idol.id, make: 'Fiat', model: '600', year: 1970, note: '' }

    await rest('POST', 'garage_entries', idol.token, { ...car, slot: 'first' })
    await rest('POST', 'follows', fan.token, { follower_id: fan.id, followed_id: idol.id })

    const before = await rpc<Novedad[]>('my_novedades', {}, fan.token)
    expect(before.body.some((item) => item.kind === 'garage')).toBe(false)

    await rest('POST', 'garage_entries', idol.token, { ...car, slot: 'dream', make: 'Porsche', model: '911' })
    const after = await rpc<Novedad[]>('my_novedades', {}, fan.token)
    expect(after.body).toContainEqual(expect.objectContaining({ kind: 'garage', actor_id: idol.id }))
  })

  it('al marcarlas vistas dejan de ser nuevas', async () => {
    const [fan, idol] = await Promise.all([newUser(), newUser()])
    await rest('POST', 'follows', fan.token, { follower_id: fan.id, followed_id: idol.id })

    expect((await rpc('mark_novedades_seen', {}, idol.token)).status).toBeLessThan(300)
    const answer = await rpc<Novedad[]>('my_novedades', {}, idol.token)
    expect(answer.body.every((item) => !item.unseen)).toBe(true)
  })
})
