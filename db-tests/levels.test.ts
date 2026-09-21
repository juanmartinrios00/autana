import { describe, expect, it } from 'vitest'
import { newListing, newUser, rest, type TestUser } from './helpers'

/**
 * Lo que cuenta `profile_stats` para los niveles (migración 022).
 *
 * Lo que se promete y hay que sostener:
 *   · marcar un aviso como vendido o pausarlo no lo saca de los publicados
 *   · las fotos de un aviso vendido siguen contando para "Publicación completa"
 *   · un borrador no cuenta, y uno borrado deja de contar
 *   · nadie más que el dueño se entera de sus pausados ni de sus vendidos
 */

interface Stats {
  active_listings: number
  published_listings: number
  sold_listings: number
  best_photos: number
}

async function stats(of: TestUser, token: string | null): Promise<Stats> {
  const answer = await rest<Stats[]>(
    'GET',
    `profile_stats?select=active_listings,published_listings,sold_listings,best_photos&user_id=eq.${of.id}`,
    token,
  )
  expect(answer.status).toBe(200)
  return answer.body![0]!
}

async function withPhotos(owner: TestUser, listingId: string, count: number) {
  const rows = Array.from({ length: count }, (_, position) => ({
    listing_id: listingId,
    path: `${owner.id}/${listingId}/${position}.webp`,
    position,
  }))
  const answer = await rest('POST', 'listing_images', owner.token, rows)
  expect(answer.status).toBeLessThan(300)
}

async function setStatus(owner: TestUser, listingId: string, status: string) {
  const answer = await rest('PATCH', `listings?id=eq.${listingId}`, owner.token, { status })
  expect(answer.status).toBeLessThan(300)
}

describe('los avisos que cuentan para los niveles', () => {
  it('vender un auto no lo saca de los publicados ni se lleva sus fotos', async () => {
    const seller = await newUser('Particular')
    const listing = await newListing(seller)
    await withPhotos(seller, listing.id, 8)

    expect(await stats(seller, seller.token)).toEqual({
      active_listings: 1,
      published_listings: 1,
      sold_listings: 0,
      best_photos: 8,
    })

    await setStatus(seller, listing.id, 'sold')

    expect(await stats(seller, seller.token)).toEqual({
      active_listings: 0,
      published_listings: 1,
      sold_listings: 1,
      best_photos: 8,
    })
  })

  it('pausado cuenta como publicado; un borrador no', async () => {
    const seller = await newUser('Pausa')
    const paused = await newListing(seller)
    await setStatus(seller, paused.id, 'paused')
    await newListing(seller, { status: 'draft' })

    const own = await stats(seller, seller.token)
    expect(own.active_listings).toBe(0)
    expect(own.published_listings).toBe(1)
  })

  it('borrar un aviso sí lo saca de la cuenta', async () => {
    const seller = await newUser('Borra')
    const listing = await newListing(seller)
    await setStatus(seller, listing.id, 'sold')
    expect((await stats(seller, seller.token)).published_listings).toBe(1)

    const answer = await rest('DELETE', `listings?id=eq.${listing.id}`, seller.token)
    expect(answer.status).toBeLessThan(300)

    const own = await stats(seller, seller.token)
    expect(own.published_listings).toBe(0)
    expect(own.sold_listings).toBe(0)
  })

  /* La vista está abierta a `anon` y corre con los permisos de quien pregunta.
     Los pausados y vendidos de otro no se pueden leer, así que para él y para
     cualquiera sin sesión la vista tiene que dar como si no existieran: nadie se
     entera de cuánto vendiste. */
  it('otro usuario y alguien sin sesión no ven tus pausados ni tus vendidos', async () => {
    const [seller, stranger] = await Promise.all([newUser('Dueño'), newUser('Otro')])
    await newListing(seller)
    const sold = await newListing(seller)
    await setStatus(seller, sold.id, 'sold')
    const paused = await newListing(seller)
    await setStatus(seller, paused.id, 'paused')

    expect(await stats(seller, seller.token)).toMatchObject({
      active_listings: 1,
      published_listings: 3,
      sold_listings: 1,
    })

    for (const [who, token] of [
      ['otro usuario', stranger.token],
      ['sin sesión', null],
    ] as const) {
      const seen = await stats(seller, token)
      expect(seen.published_listings, who).toBe(1)
      expect(seen.sold_listings, who).toBe(0)
    }
  })
})
