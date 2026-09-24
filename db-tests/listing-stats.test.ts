import { describe, expect, it } from 'vitest'
import { asService, newListing, newUser, rest, rpc, type TestUser } from './helpers'

/**
 * Las estadísticas por aviso (027).
 *
 * Lo que se prueba es sobre todo quién ve qué: las visitas y las consultas de
 * un aviso son información del negocio de quien lo publica, y una concesionaria
 * no puede leer cómo le va a la de al lado. La función es `security definer`,
 * así que lo único que las separa es el `where` contra `auth.uid()`.
 */

interface Dia {
  listing_id: string
  day: string
  views: number
  interests: number
}

async function stats(who: TestUser | null, days = 14) {
  const answer = await rpc<Dia[]>('my_listing_stats', { days }, who?.token ?? null)
  return answer
}

async function verAviso(slug: string, quien: TestUser | null) {
  const answer = await rpc('register_listing_view', { listing_slug: slug }, quien?.token ?? null)
  expect(answer.status).toBeLessThan(300)
}

describe('las estadísticas de mis avisos', () => {
  it('cuenta las visitas del día y las devuelve al dueño', async () => {
    const seller = await newUser('Vendedor')
    const listing = await newListing(seller)

    await verAviso(listing.slug, null)
    await verAviso(listing.slug, null)

    const answer = await stats(seller)
    expect(answer.status).toBe(200)
    expect(answer.body).toHaveLength(1)
    expect(answer.body![0]).toMatchObject({ listing_id: listing.id, views: 2, interests: 0 })
  })

  /* El contador de siempre, que es lo que se muestra en la ficha, tiene que
     seguir subiendo igual: la migración le agregó un lado, no lo reemplazó. */
  it('el contador de la ficha sigue andando', async () => {
    const seller = await newUser('Vendedor')
    const listing = await newListing(seller)
    await verAviso(listing.slug, null)

    const answer = await rest<{ view_count: number }[]>(
      'GET',
      `listings?id=eq.${listing.id}&select=view_count`,
      null,
    )
    expect(answer.body?.[0]?.view_count).toBe(1)
  })

  it('las consultas aparecen el día que se hicieron', async () => {
    const [seller, buyer] = await Promise.all([newUser('Vendedor'), newUser('Comprador')])
    const listing = await newListing(seller)

    const interes = await rpc('express_interest', { p_slug: listing.slug }, buyer.token)
    expect(interes.status).toBeLessThan(300)

    const answer = await stats(seller)
    expect(answer.body![0]).toMatchObject({ listing_id: listing.id, interests: 1 })
  })

  /* El punto de toda la función. */
  it('nadie ve las de otro', async () => {
    const [seller, stranger] = await Promise.all([newUser('Dueño'), newUser('Otro')])
    const listing = await newListing(seller)
    await verAviso(listing.slug, null)

    const ajenas = await stats(stranger)
    expect(ajenas.status).toBe(200)
    expect(ajenas.body).toEqual([])
  })

  it('sin sesión no se puede ni preguntar', async () => {
    const answer = await stats(null)
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  /* La tabla está cerrada: se escribe por `register_listing_view` y se lee por
     la función. Abierta, cualquiera leería las visitas de cualquier aviso. */
  it('la tabla de visitas por día no se lee directo', async () => {
    const seller = await newUser('Dueño')
    const listing = await newListing(seller)
    await verAviso(listing.slug, null)

    const propia = await rest('GET', `listing_views_daily?listing_id=eq.${listing.id}`, seller.token)
    expect(propia.status).toBeGreaterThanOrEqual(400)
  })

  /* Un aviso pausado o vendido no suma visitas: la función sólo toca los
     activos, como antes. */
  it('un aviso que no está activo no suma', async () => {
    const seller = await newUser('Dueño')
    const listing = await newListing(seller)
    const pausado = await rest('PATCH', `listings?id=eq.${listing.id}`, seller.token, {
      status: 'paused',
    })
    expect(pausado.status).toBeLessThan(300)

    await verAviso(listing.slug, null)
    expect((await stats(seller)).body).toEqual([])
  })
})

/**
 * El día es el de acá y no el de UTC.
 *
 * Supabase corre en UTC, donde el día cambia a las 21 hora argentina. Una
 * consulta de las 22 quedaba anotada al día siguiente, y el gráfico ---que
 * arma los días con la fecha del navegador--- no la mostraba: el dato estaba
 * en la base y en la pantalla no aparecía nunca. Es el mismo corrimiento que
 * ya muerde las fechas del blog.
 */
describe('las fechas son las de Argentina', () => {
  it('una consulta de las 22 cuenta ese día, no el siguiente', async () => {
    const [seller, buyer] = await Promise.all([newUser('Dueño'), newUser('Comprador')])
    const listing = await newListing(seller)

    /* Las 01:30 UTC de hoy son las 22:30 de ayer en Argentina. Se arma desde
       la fecha de hoy y no con una escrita a mano, para que el caso no se
       salga de la ventana de días cuando pase el tiempo. */
    const ahora = new Date()
    const instante = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), 1, 30),
    )
    const diaArgentino = instante.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    const puesto = await asService('POST', 'listing_interests', {
      user_id: buyer.id,
      listing_id: listing.id,
      created_at: instante.toISOString(),
    })
    expect(puesto.status).toBeLessThan(300)

    const stats = await rpc<{ day: string; interests: number }[]>(
      'my_listing_stats',
      { days: 90 },
      seller.token,
    )
    const dia = stats.body?.find((row) => row.interests > 0)
    expect(dia?.day).toBe(diaArgentino)
  })
})
