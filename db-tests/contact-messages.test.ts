import { describe, expect, it } from 'vitest'
import { asService, newUser, readAsService, rest, type TestUser } from './helpers'

/**
 * Los mensajes de contacto (migración 019).
 *
 * Es la única tabla que escribe gente sin cuenta, así que lo que se prueba acá
 * es sobre todo lo que NO se puede hacer desde afuera.
 */

let counter = 0

function draft(extra: Record<string, unknown> = {}) {
  counter += 1
  return {
    name: 'Persona de prueba',
    email: `contacto${Date.now()}${counter}@test.local`,
    subject: 'account',
    message: 'Hola, no puedo entrar a mi cuenta y necesito una mano con eso.',
    ...extra,
  }
}

async function send(token: string | null, body: Record<string, unknown>) {
  return rest('POST', 'contact_messages', token, body)
}

async function makeAdmin(user: TestUser) {
  /* Como se hace de verdad: por SQL. Desde la API nadie se hace admin (017). */
  await asService('PATCH', `profiles?id=eq.${user.id}`, { role: 'admin' })
}

describe('mandar un mensaje', () => {
  it('sin cuenta se puede: es el caso que hay que atender', async () => {
    expect((await send(null, draft())).status).toBeLessThan(300)
  })

  it('con cuenta queda atado a esa cuenta', async () => {
    const user = await newUser()
    const body = draft({ user_id: user.id })
    expect((await send(user.token, body)).status).toBeLessThan(300)

    const row = await readAsService<{ user_id: string }>(
      'contact_messages',
      `email=eq.${body.email}`,
      'user_id',
    )
    expect(row?.user_id).toBe(user.id)
  })

  it('no se puede mandar a nombre de otra persona', async () => {
    const [user, other] = await Promise.all([newUser(), newUser()])
    const answer = await send(user.token, draft({ user_id: other.id }))
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  it('sin sesión no se puede decir que hay cuenta', async () => {
    const user = await newUser()
    const answer = await send(null, draft({ user_id: user.id }))
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })
})

describe('lo que la base no acepta', () => {
  it('un mensaje demasiado corto', async () => {
    expect((await send(null, draft({ message: 'hola' }))).status).toBeGreaterThanOrEqual(400)
  })

  it('un nombre vacío', async () => {
    expect((await send(null, draft({ name: '   ' }))).status).toBeGreaterThanOrEqual(400)
  })

  it('algo que no es un mail', async () => {
    expect((await send(null, draft({ email: 'no-es-un-mail' }))).status).toBeGreaterThanOrEqual(400)
  })

  it('un motivo inventado', async () => {
    expect((await send(null, draft({ subject: 'lo-que-sea' }))).status).toBeGreaterThanOrEqual(400)
  })

  it('llegar ya respondido, que lo escondería de los pendientes', async () => {
    expect((await send(null, draft({ handled: true }))).status).toBeGreaterThanOrEqual(400)
  })

  it('llegar con fecha vieja, que lo enterraría al fondo de la lista', async () => {
    const answer = await send(null, draft({ created_at: '2020-01-01T00:00:00Z' }))
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })
})

describe('el freno por correo', () => {
  it('deja tres en una hora y para el cuarto', async () => {
    const email = `insistente${Date.now()}@test.local`
    for (let i = 0; i < 3; i += 1) {
      expect((await send(null, draft({ email }))).status).toBeLessThan(300)
    }
    expect((await send(null, draft({ email }))).status).toBeGreaterThanOrEqual(400)
  })

  it('no frena a otra persona', async () => {
    const email = `insistente2${Date.now()}@test.local`
    for (let i = 0; i < 3; i += 1) await send(null, draft({ email }))
    expect((await send(null, draft())).status).toBeLessThan(300)
  })
})

describe('quién los lee', () => {
  it('quien escribió no los ve, ni con cuenta', async () => {
    const user = await newUser()
    const body = draft({ user_id: user.id })
    await send(user.token, body)

    const own = await rest<unknown[]>('GET', 'contact_messages?select=id', user.token)
    expect(own.body).toHaveLength(0)
  })

  it('sin sesión tampoco: la lista tiene mails', async () => {
    await send(null, draft())
    const anyone = await rest<unknown[]>('GET', 'contact_messages?select=id', null)
    expect(anyone.body).toHaveLength(0)
  })

  it('quien modera los ve', async () => {
    const admin = await newUser()
    await makeAdmin(admin)
    await send(null, draft())

    const seen = await rest<unknown[]>('GET', 'contact_messages?select=id', admin.token)
    expect(seen.body.length).toBeGreaterThan(0)
  })
})

describe('marcar y borrar', () => {
  it('sólo quien modera marca como respondido', async () => {
    const [admin, curious] = await Promise.all([newUser(), newUser()])
    await makeAdmin(admin)

    const body = draft()
    await send(null, body)
    const row = await readAsService<{ id: string }>('contact_messages', `email=eq.${body.email}`, 'id')
    const id = row!.id

    /* Sin permiso la fila no se ve, así que el PATCH no encuentra nada que
       cambiar: no falla, no hace nada. Lo que importa es que siga en false. */
    await rest('PATCH', `contact_messages?id=eq.${id}`, curious.token, { handled: true })
    let after = await readAsService<{ handled: boolean }>('contact_messages', `id=eq.${id}`, 'handled')
    expect(after?.handled).toBe(false)

    await rest('PATCH', `contact_messages?id=eq.${id}`, admin.token, { handled: true })
    after = await readAsService<{ handled: boolean }>('contact_messages', `id=eq.${id}`, 'handled')
    expect(after?.handled).toBe(true)
  })

  it('ni quien modera edita el mensaje: es lo que la persona escribió', async () => {
    const admin = await newUser()
    await makeAdmin(admin)

    const body = draft()
    await send(null, body)
    const row = await readAsService<{ id: string }>('contact_messages', `email=eq.${body.email}`, 'id')

    const answer = await rest('PATCH', `contact_messages?id=eq.${row!.id}`, admin.token, {
      message: 'otra cosa completamente distinta',
    })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  it('sólo quien modera borra', async () => {
    const [admin, curious] = await Promise.all([newUser(), newUser()])
    await makeAdmin(admin)

    const body = draft()
    await send(null, body)
    const row = await readAsService<{ id: string }>('contact_messages', `email=eq.${body.email}`, 'id')
    const id = row!.id

    await rest('DELETE', `contact_messages?id=eq.${id}`, curious.token)
    expect(await readAsService('contact_messages', `id=eq.${id}`, 'id')).toBeDefined()

    await rest('DELETE', `contact_messages?id=eq.${id}`, admin.token)
    expect(await readAsService('contact_messages', `id=eq.${id}`, 'id')).toBeUndefined()
  })
})
