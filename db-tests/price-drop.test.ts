import { describe, expect, it } from 'vitest'
import { asService, newListing, newUser, readAsService, rest, rpc, type TestUser } from './helpers'

/**
 * Bajó de precio (028).
 *
 * El precio de antes lo escribe un trigger con reglas: el precio anterior tuvo
 * que estar publicado unos días y la baja tiene que ser de al menos el uno por
 * ciento. Los tests "envejecen" el precio escribiendo `price_set_at` como
 * servicio, que es lo único que no se puede esperar de verdad.
 */

interface Precio {
  price: number
  previous_price: number | null
  price_dropped_at: string | null
}

async function envejecer(id: string, dias = 5) {
  const answer = await asService('PATCH', `listings?id=eq.${id}`, {
    price_set_at: new Date(Date.now() - dias * 86_400_000).toISOString(),
  })
  expect(answer.status).toBeLessThan(300)
}

async function ponerPrecio(owner: TestUser, id: string, price: number, extra: object = {}) {
  const answer = await rest('PATCH', `listings?id=eq.${id}`, owner.token, { price, ...extra })
  expect(answer.status).toBeLessThan(300)
}

const leer = (id: string) =>
  readAsService<Precio>('listings', `id=eq.${id}`, 'price,previous_price,price_dropped_at')

describe('el precio de antes', () => {
  it('se guarda cuando baja un precio que llevaba días publicado', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)

    expect(await leer(id)).toMatchObject({ price: 27000, previous_price: 30000 })
  })

  it('en dos bajas seguidas, el de antes es el primero', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)
    await ponerPrecio(owner, id, 26000)

    expect(await leer(id)).toMatchObject({ price: 26000, previous_price: 30000 })
  })

  /* La vuelta corta: subirlo a la mañana y bajarlo a la tarde para aparecer
     como rebajado. */
  it('no cuenta si el precio de antes se acababa de poner', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 36000)
    await ponerPrecio(owner, id, 30000)

    expect(await leer(id)).toMatchObject({ price: 30000, previous_price: null })
  })

  it('no cuenta una baja de menos del uno por ciento', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 29900)

    expect((await leer(id))?.previous_price).toBeNull()
  })

  it('se borra si después sube', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)
    await ponerPrecio(owner, id, 28000)

    expect(await leer(id)).toMatchObject({ previous_price: null, price_dropped_at: null })
  })

  it('cambiar de moneda no es bajar', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 20_000_000, { currency: 'ARS' })
    await envejecer(id)
    await ponerPrecio(owner, id, 30, { currency: 'USD' })

    expect((await leer(id))?.previous_price).toBeNull()
  })

  it('el vendedor no lo puede escribir a mano', async () => {
    const owner = await newUser('Vende')
    const { id } = await newListing(owner, { price: 30000 })
    const answer = await rest('PATCH', `listings?id=eq.${id}`, owner.token, { previous_price: 90000 })

    expect(answer.status).toBeGreaterThanOrEqual(400)
    expect((await leer(id))?.previous_price).toBeNull()
  })
})

describe('la novedad de la rebaja', () => {
  interface Novedad {
    kind: string
    listing_slug: string | null
    amount: number
    price_now: number | null
    price_before: number | null
    price_currency: string | null
  }

  async function guardar(who: TestUser, listingId: string) {
    const answer = await rest('POST', 'favorites', who.token, { user_id: who.id, listing_id: listingId })
    expect(answer.status).toBeLessThan(300)
  }

  async function rebajas(who: TestUser) {
    const answer = await rpc<Novedad[]>('my_novedades', {}, who.token)
    expect(answer.status).toBe(200)
    return answer.body!.filter((item) => item.kind === 'price_drop')
  }

  it('le llega a quien lo tenía guardado, con el precio de ahora y el de antes', async () => {
    const [owner, fan] = await Promise.all([newUser('Vende'), newUser('Guarda')])
    const { id, slug } = await newListing(owner, { price: 30000 })
    await guardar(fan, id)
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)

    expect(await rebajas(fan)).toEqual([
      expect.objectContaining({
        listing_slug: slug,
        amount: 3000,
        price_now: 27000,
        price_before: 30000,
        price_currency: 'USD',
      }),
    ])
  })

  it('no le llega a quien no lo guardó, ni al que lo vende', async () => {
    const [owner, other] = await Promise.all([newUser('Vende'), newUser('Otro')])
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)

    expect(await rebajas(other)).toHaveLength(0)
    expect(await rebajas(owner)).toHaveLength(0)
  })

  /* Si ya estaba rebajado cuando lo guardó, lo vio así: no es novedad. */
  it('no cuenta una rebaja de antes de guardarlo', async () => {
    const [owner, fan] = await Promise.all([newUser('Vende'), newUser('Guarda')])
    const { id } = await newListing(owner, { price: 30000 })
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)
    await guardar(fan, id)

    expect(await rebajas(fan)).toHaveLength(0)
  })

  it('no cuenta si el aviso ya no está activo', async () => {
    const [owner, fan] = await Promise.all([newUser('Vende'), newUser('Guarda')])
    const { id } = await newListing(owner, { price: 30000 })
    await guardar(fan, id)
    await envejecer(id)
    await ponerPrecio(owner, id, 27000)
    await rest('PATCH', `listings?id=eq.${id}`, owner.token, { status: 'sold' })

    expect(await rebajas(fan)).toHaveLength(0)
  })
})
