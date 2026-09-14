import { describe, expect, it } from 'vitest'
import { newListing, newUser, readAsService, rest, rpc, type TestUser } from './helpers'

/**
 * "Me interesa" y los datos de contacto (migración 014).
 *
 * Lo que se promete y hay que sostener:
 *   · el contacto de un aviso sólo sale con sesión, y por "Me interesa"
 *   · cada persona suma una vez por aviso; el dueño no suma
 *   · WhatsApp y mail no se leen de la tabla, ni con sesión
 *   · hay un tope de 30 personas nuevas por día
 */

async function withContact(name = 'Vendedor'): Promise<TestUser> {
  const seller = await newUser(name)
  await rest('PATCH', `profiles?id=eq.${seller.id}`, seller.token, {
    whatsapp: '11 5555 0000',
    instagram: 'vendedor.test',
    contact_email: 'vendedor@test.local',
  })
  return seller
}

interface Contact {
  seller_name: string
  whatsapp: string | null
  instagram: string | null
  contact_email: string | null
  interest_count: number
}

describe('el contacto de un aviso', () => {
  it('sin sesión no sale por ningún lado', async () => {
    const seller = await withContact()
    const listing = await newListing(seller)

    expect((await rpc('express_interest', { p_slug: listing.slug }, null)).status).toBeGreaterThanOrEqual(400)
    expect((await rpc('listing_whatsapp', { p_slug: listing.slug }, null)).status).toBeGreaterThanOrEqual(400)
    expect((await rest('GET', `profiles?select=whatsapp&id=eq.${seller.id}`, null)).status).toBeGreaterThanOrEqual(400)
  })

  it('con sesión tampoco se lee de la tabla: sólo por "Me interesa"', async () => {
    const [seller, buyer] = await Promise.all([withContact(), newUser('Comprador')])
    await newListing(seller)

    for (const column of ['whatsapp', 'contact_email']) {
      const answer = await rest('GET', `profiles?select=${column}&id=eq.${seller.id}`, buyer.token)
      expect(answer.status, column).toBeGreaterThanOrEqual(400)
    }
    /* El camino viejo, que daba el número sin sumar al contador. */
    const listing = await newListing(seller)
    expect((await rpc('listing_whatsapp', { p_slug: listing.slug }, buyer.token)).status).toBeGreaterThanOrEqual(400)
  })

  it('"Me interesa" devuelve el contacto y suma uno', async () => {
    const [seller, buyer] = await Promise.all([withContact('Ana'), newUser('Comprador')])
    const listing = await newListing(seller)

    const answer = await rpc<Contact[]>('express_interest', { p_slug: listing.slug }, buyer.token)
    expect(answer.status).toBe(200)
    expect(answer.body[0]).toMatchObject({
      seller_name: 'Ana',
      whatsapp: '11 5555 0000',
      instagram: 'vendedor.test',
      contact_email: 'vendedor@test.local',
      interest_count: 1,
    })
  })

  it('la misma persona suma una sola vez', async () => {
    const [seller, buyer] = await Promise.all([withContact(), newUser()])
    const listing = await newListing(seller)

    await rpc('express_interest', { p_slug: listing.slug }, buyer.token)
    const second = await rpc<Contact[]>('express_interest', { p_slug: listing.slug }, buyer.token)
    expect(second.body[0]?.interest_count).toBe(1)
  })

  it('personas distintas suman, y el número es público', async () => {
    const seller = await withContact()
    const listing = await newListing(seller)
    const buyers = await Promise.all([newUser(), newUser(), newUser()])
    for (const buyer of buyers) await rpc('express_interest', { p_slug: listing.slug }, buyer.token)

    const publicRow = await rest<{ interest_count: number }[]>(
      'GET',
      `listings?select=interest_count&id=eq.${listing.id}`,
      null,
    )
    expect(publicRow.body[0]?.interest_count).toBe(3)
  })

  it('el dueño ve su contacto pero no suma', async () => {
    const seller = await withContact()
    const listing = await newListing(seller)

    const answer = await rpc<Contact[]>('express_interest', { p_slug: listing.slug }, seller.token)
    expect(answer.body[0]?.interest_count).toBe(0)
  })

  it('un aviso pausado no da contacto', async () => {
    const [seller, buyer] = await Promise.all([withContact(), newUser()])
    const listing = await newListing(seller)
    await rest('PATCH', `listings?id=eq.${listing.id}`, seller.token, { status: 'paused' })

    const answer = await rpc<Contact[]>('express_interest', { p_slug: listing.slug }, buyer.token)
    expect(answer.body).toEqual([])
  })

  it('nadie ve quién más se interesó', async () => {
    const [seller, buyer, curious] = await Promise.all([withContact(), newUser(), newUser()])
    const listing = await newListing(seller)
    await rpc('express_interest', { p_slug: listing.slug }, buyer.token)

    for (const who of [seller, curious]) {
      const answer = await rest<unknown[]>('GET', `listing_interests?listing_id=eq.${listing.id}`, who.token)
      expect(answer.body).toEqual([])
    }
    /* El que tocó ve el suyo, para que el botón diga "Te interesa". */
    const own = await rest<unknown[]>('GET', `listing_interests?listing_id=eq.${listing.id}`, buyer.token)
    expect(own.body).toHaveLength(1)
  })

  it('no se puede sumar interés a mano', async () => {
    const [seller, buyer] = await Promise.all([withContact(), newUser()])
    const listing = await newListing(seller)
    const answer = await rest('POST', 'listing_interests', buyer.token, {
      user_id: buyer.id,
      listing_id: listing.id,
    })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })
})

describe('el contacto en el perfil', () => {
  it('Instagram es público; WhatsApp y mail piden sesión', async () => {
    const seller = await withContact()
    const anon = await rest<{ instagram: string }[]>('GET', `profiles?select=instagram&id=eq.${seller.id}`, null)
    expect(anon.body[0]?.instagram).toBe('vendedor.test')
    expect((await rpc('profile_contact', { target: seller.id }, null)).status).toBeGreaterThanOrEqual(400)

    const viewer = await newUser()
    const answer = await rpc<{ whatsapp: string; contact_email: string }[]>(
      'profile_contact',
      { target: seller.id },
      viewer.token,
    )
    expect(answer.body[0]).toEqual({ whatsapp: '11 5555 0000', contact_email: 'vendedor@test.local' })
  })

  it('pedir el contacto de alguien que no cargó nada no gasta tope', async () => {
    const [empty, viewer] = await Promise.all([newUser(), newUser()])
    const answer = await rpc<unknown[]>('profile_contact', { target: empty.id }, viewer.token)
    expect(answer.body).toEqual([])

    const reveals = await readAsService('contact_reveals', `viewer_id=eq.${viewer.id}`)
    expect(reveals).toBeUndefined()
  })
})

describe('el tope diario de contactos', () => {
  it('corta en la persona nueva número 31, y no por volver a ver a una', async () => {
    const buyer = await newUser('Juntador')
    const sellers = await Promise.all(Array.from({ length: 31 }, () => withContact()))

    for (const seller of sellers.slice(0, 30)) {
      const answer = await rpc('profile_contact', { target: seller.id }, buyer.token)
      expect(answer.status).toBe(200)
    }

    /* Volver a una de las 30 no suma. */
    expect((await rpc('profile_contact', { target: sellers[0]!.id }, buyer.token)).status).toBe(200)

    const blocked = await rpc<{ message: string }>('profile_contact', { target: sellers[30]!.id }, buyer.token)
    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toContain('máximo')
  })

  it('el tope también frena "Me interesa"', async () => {
    const buyer = await newUser('Juntador')
    const sellers = await Promise.all(Array.from({ length: 30 }, () => withContact()))
    for (const seller of sellers) await rpc('profile_contact', { target: seller.id }, buyer.token)

    const extra = await withContact()
    const listing = await newListing(extra)
    const answer = await rpc('express_interest', { p_slug: listing.slug }, buyer.token)
    expect(answer.status).toBe(429)

    /* Y no sumó: si el tope corta, el interés tampoco queda anotado. */
    const row = await readAsService<{ interest_count: number }>('listings', `id=eq.${listing.id}`, 'interest_count')
    expect(row?.interest_count).toBe(0)
  })
})
