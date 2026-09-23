import { describe, expect, it } from 'vitest'
import { asService, newUser, rest, rpc, type TestUser } from './helpers'

/**
 * Las novedades del garage (025): una por auto, y dicen cuál.
 *
 * `my_novedades` es una función sola que arma tres cosas distintas con `union
 * all`, así que las columnas tienen que alinearse a mano en los tres lados. Si
 * una queda corrida, la pantalla entera se cae o muestra el dato equivocado, y
 * eso no lo ve ningún test de TypeScript.
 */

interface Novedad {
  kind: string
  actor_id: string | null
  actor_name: string | null
  amount: number
  garage_slot: string | null
  garage_car: string | null
  garage_photo: string | null
  garage_note: string | null
  garage_is_new: boolean | null
}

async function novedades(who: TestUser): Promise<Novedad[]> {
  const answer = await rpc<Novedad[]>('my_novedades', {}, who.token)
  expect(answer.status).toBe(200)
  return answer.body!
}

async function cargarAuto(owner: TestUser, extra: Record<string, unknown> = {}) {
  const answer = await rest('POST', 'garage_entries', owner.token, {
    user_id: owner.id,
    slot: 'current',
    make: 'Renault',
    model: '12',
    year: 1978,
    ...extra,
  })
  expect(answer.status).toBeLessThan(300)
}

async function seguir(fan: TestUser, idol: TestUser) {
  const answer = await rest('POST', 'follows', fan.token, {
    follower_id: fan.id,
    followed_id: idol.id,
  })
  expect(answer.status).toBeLessThan(300)
}

describe('las novedades del garage', () => {
  it('dicen qué auto cargó, con la foto y la nota', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await seguir(fan, idol)
    await cargarAuto(idol, {
      photo_path: `${idol.id}/current.webp`,
      note: 'El de mi viejo.',
    })

    const [novedad, ...resto] = await novedades(fan)
    expect(resto).toHaveLength(0)
    expect(novedad).toMatchObject({
      kind: 'garage',
      actor_id: idol.id,
      actor_name: 'Pepito',
      garage_slot: 'current',
      garage_car: 'Renault 12 1978',
      garage_photo: `${idol.id}/current.webp`,
      garage_note: 'El de mi viejo.',
      garage_is_new: true,
    })
  })

  /* Una por auto y no una por persona: cargar dos autos son dos novedades,
     cada una con lo suyo. */
  it('una por auto', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await seguir(fan, idol)
    await cargarAuto(idol, { slot: 'first', make: 'Fiat', model: '600' })
    await cargarAuto(idol, { slot: 'dream', make: 'Ford', model: 'Mustang' })

    const items = await novedades(fan)
    expect(items).toHaveLength(2)
    expect(items.map((item) => item.garage_slot).sort()).toEqual(['dream', 'first'])
  })

  /* Editar uno que ya estaba no es lo mismo que sumarlo, y el texto lo dice. */
  it('distingue sumar de cambiar', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await seguir(fan, idol)
    await cargarAuto(idol)

    /* Con la fecha de creación movida atrás: el alta y el cambio pasan en el
       mismo segundo y ninguna prueba los distinguiría. */
    const movida = await asService(
      'PATCH',
      `garage_entries?user_id=eq.${idol.id}`,
      { created_at: new Date(Date.now() - 86_400_000).toISOString() },
    )
    expect(movida.status).toBeLessThan(300)

    const answer = await rest('PATCH', `garage_entries?user_id=eq.${idol.id}`, idol.token, {
      model: '12 Break',
    })
    expect(answer.status).toBeLessThan(300)

    const [novedad] = await novedades(fan)
    expect(novedad?.garage_is_new).toBe(false)
    expect(novedad?.garage_car).toBe('Renault 12 Break 1978')
  })

  /* Un garage escondido por moderación (018) no reparte sus fotos ni sus notas
     por las novedades de sus seguidores. */
  it('un perfil oculto no manda foto ni nota', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await seguir(fan, idol)
    await cargarAuto(idol, { photo_path: `${idol.id}/current.webp`, note: 'Mirá esto' })
    const oculto = await asService('PATCH', `profiles?id=eq.${idol.id}`, { content_hidden: true })
    expect(oculto.status).toBeLessThan(300)

    const [novedad] = await novedades(fan)
    expect(novedad?.garage_photo).toBeNull()
    expect(novedad?.garage_note).toBeNull()
    /* El auto sí: sin él la novedad no se entiende, y no es algo que la
       persona escribió. */
    expect(novedad?.garage_car).toBe('Renault 12 1978')
  })

  /* Lo que ya estaba cargado antes de seguirla no es novedad para nadie. */
  it('sólo lo que pasó después de empezar a seguir', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await cargarAuto(idol)
    await seguir(fan, idol)

    expect(await novedades(fan)).toHaveLength(0)
  })

  /* Las otras dos clases de novedad comparten las mismas columnas. */
  it('las de seguidores siguen andando y no traen datos de garage', async () => {
    const [fan, idol] = await Promise.all([newUser('Fan'), newUser('Pepito')])
    await seguir(fan, idol)

    const [novedad] = await novedades(idol)
    expect(novedad).toMatchObject({ kind: 'follow', actor_id: fan.id, amount: 1 })
    expect(novedad?.garage_slot).toBeNull()
    expect(novedad?.garage_car).toBeNull()
  })
})
