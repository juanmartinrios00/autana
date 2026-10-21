import { describe, expect, it } from 'vitest'
import { asService, newListing, newUser, readAsService, rest, rpc } from './helpers'

/**
 * La fecha de modificación del aviso (029).
 *
 * Es el `lastmod` del sitemap. Los contadores ---visitas, interesados,
 * favoritos--- también escriben la fila, y antes de la 029 cada visita le
 * ponía la fecha de ahora a un aviso que nadie había tocado.
 *
 * Para ver si la fecha se movió, primero se la tira para atrás como servicio:
 * con la fecha recién puesta, "no cambió" y "cambió hace un milisegundo" no se
 * distinguen.
 */

const HACE_UNA_SEMANA = new Date(Date.now() - 7 * 86_400_000).toISOString()

async function envejecer(id: string) {
  const answer = await asService('PATCH', `listings?id=eq.${id}`, { updated_at: HACE_UNA_SEMANA })
  expect(answer.status).toBeLessThan(300)
}

async function fecha(id: string) {
  const row = await readAsService<{ updated_at: string }>('listings', `id=eq.${id}`, 'updated_at')
  return new Date(row!.updated_at).getTime()
}

describe('la fecha de modificación del aviso', () => {
  it('no la mueve una visita', async () => {
    const owner = await newUser('Vende')
    const listing = await newListing(owner)
    await envejecer(listing.id)
    const antes = await fecha(listing.id)

    const answer = await rpc('register_listing_view', { listing_slug: listing.slug }, null)
    expect(answer.status).toBeLessThan(300)

    const despues = await readAsService<{ view_count: number; updated_at: string }>(
      'listings',
      `id=eq.${listing.id}`,
      'view_count,updated_at',
    )
    /* La visita sí se contó: si no, el test pasaría por no haber escrito nada. */
    expect(despues?.view_count).toBe(1)
    expect(new Date(despues!.updated_at).getTime()).toBe(antes)
  })

  it('no la mueve alguien que lo guarda en favoritos', async () => {
    const owner = await newUser('Vende')
    const buyer = await newUser('Compra')
    const listing = await newListing(owner)
    await envejecer(listing.id)
    const antes = await fecha(listing.id)

    const answer = await rest('POST', 'favorites', buyer.token, { user_id: buyer.id, listing_id: listing.id })
    expect(answer.status).toBeLessThan(300)

    const despues = await readAsService<{ favorite_count: number }>('listings', `id=eq.${listing.id}`, 'favorite_count')
    expect(despues?.favorite_count).toBe(1)
    expect(await fecha(listing.id)).toBe(antes)
  })

  it('la mueve el vendedor cuando edita', async () => {
    const owner = await newUser('Vende')
    const listing = await newListing(owner)
    await envejecer(listing.id)
    const antes = await fecha(listing.id)

    const answer = await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, { description: 'Service al día.' })
    expect(answer.status).toBeLessThan(300)

    expect(await fecha(listing.id)).toBeGreaterThan(antes)
  })
})
