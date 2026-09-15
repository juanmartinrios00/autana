import { describe, expect, it } from 'vitest'
import { asService, newUser, readAsService, rest, rpc, type TestUser } from './helpers'

/**
 * Reportar garages y perfiles (migración 018).
 */

async function report(reporter: TestUser, target: TestUser, reason = 'photo') {
  return rest('POST', 'profile_reports', reporter.token, {
    profile_id: target.id,
    reporter_id: reporter.id,
    reason,
    detail: 'Prueba',
  })
}

async function makeAdmin(user: TestUser) {
  /* Como se hace de verdad: por SQL, con la clave de quien administra. Desde la
     API nadie se puede hacer admin (017). */
  await asService('PATCH', `profiles?id=eq.${user.id}`, { role: 'admin' })
}

describe('reportar un perfil', () => {
  it('pide cuenta', async () => {
    const target = await newUser()
    const answer = await rest('POST', 'profile_reports', null, {
      profile_id: target.id,
      reason: 'photo',
    })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  it('con cuenta se reporta, una vez por persona', async () => {
    const [reporter, target] = await Promise.all([newUser(), newUser()])
    expect((await report(reporter, target)).status).toBeLessThan(300)
    expect((await report(reporter, target, 'spam')).status).toBeGreaterThanOrEqual(400)
  })

  it('no se puede reportar a uno mismo', async () => {
    const user = await newUser()
    expect((await report(user, user)).status).toBeGreaterThanOrEqual(400)
  })

  it('no se puede reportar en nombre de otro', async () => {
    const [reporter, other, target] = await Promise.all([newUser(), newUser(), newUser()])
    const answer = await rest('POST', 'profile_reports', reporter.token, {
      profile_id: target.id,
      reporter_id: other.id,
      reason: 'photo',
    })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })

  it('quien reportó ve el suyo; el reportado y los demás, ninguno', async () => {
    const [reporter, target, curious] = await Promise.all([newUser(), newUser(), newUser()])
    await report(reporter, target)

    const own = await rest<unknown[]>('GET', `profile_reports?profile_id=eq.${target.id}`, reporter.token)
    expect(own.body).toHaveLength(1)

    for (const who of [target, curious]) {
      const answer = await rest<unknown[]>('GET', `profile_reports?profile_id=eq.${target.id}`, who.token)
      expect(answer.body).toEqual([])
    }
  })
})

describe('ocultar solo, con tres personas', () => {
  it('con dos no pasa nada; con tres se oculta el contenido', async () => {
    const target = await newUser()
    const reporters = await Promise.all([newUser(), newUser(), newUser()])

    await report(reporters[0]!, target)
    await report(reporters[1]!, target)
    let row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(false)

    await report(reporters[2]!, target)
    row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(true)
  })

  it('la persona no se lo puede sacar sola', async () => {
    const target = await newUser()
    await asService('PATCH', `profiles?id=eq.${target.id}`, { content_hidden: true })

    const answer = await rest('PATCH', `profiles?id=eq.${target.id}`, target.token, { content_hidden: false })
    expect(answer.status).toBeGreaterThanOrEqual(400)
    const row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(true)
  })

  it('con el contenido oculto, la foto no sale en el buscador', async () => {
    const name = `Oculto ${Math.random().toString(36).slice(2, 8)}`
    const target = await newUser(name)
    await rest('PATCH', `profiles?id=eq.${target.id}`, target.token, {
      avatar_url: `${target.id}/avatar/profile-1.webp`,
    })

    const visible = await rpc<{ id: string; avatar_url: string | null }[]>('search_people', { term: name }, null)
    expect(visible.body.find((row) => row.id === target.id)?.avatar_url).toContain('/avatar/')

    await asService('PATCH', `profiles?id=eq.${target.id}`, { content_hidden: true })
    const hidden = await rpc<{ id: string; avatar_url: string | null }[]>('search_people', { term: name }, null)
    expect(hidden.body.find((row) => row.id === target.id)?.avatar_url).toBeNull()
  })

  it('el buscador sin sesión sigue andando', async () => {
    /* `visible_avatar` recibe columnas sueltas y no la fila: con la fila, el
       buscador pediría leer todas las columnas del perfil y sin sesión
       fallaría entero. */
    const answer = await rpc('search_people', { term: 'test' }, null)
    expect(answer.status).toBe(200)
  })
})

describe('lo que decide quien modera', () => {
  it('quien modera ve todos los reportes', async () => {
    const [admin, reporter, target] = await Promise.all([newUser(), newUser(), newUser()])
    await makeAdmin(admin)
    await report(reporter, target)

    const answer = await rest<unknown[]>('GET', `profile_reports?profile_id=eq.${target.id}`, admin.token)
    expect(answer.body).toHaveLength(1)
  })

  it('oculta y vuelve a mostrar', async () => {
    const [admin, target] = await Promise.all([newUser(), newUser()])
    await makeAdmin(admin)

    expect((await rpc('admin_set_content_hidden', { target: target.id, hidden: true }, admin.token)).status).toBeLessThan(300)
    let row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(true)

    await rpc('admin_set_content_hidden', { target: target.id, hidden: false }, admin.token)
    row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(false)
  })

  it('nadie más puede ocultar ni mostrar', async () => {
    const [someone, target] = await Promise.all([newUser(), newUser()])
    const answer = await rpc('admin_set_content_hidden', { target: target.id, hidden: true }, someone.token)
    expect(answer.status).toBeGreaterThanOrEqual(400)

    const row = await readAsService<{ content_hidden: boolean }>('profiles', `id=eq.${target.id}`, 'content_hidden')
    expect(row?.content_hidden).toBe(false)
  })

  it('quien modera descarta reportes; nadie más', async () => {
    const [admin, reporter, target] = await Promise.all([newUser(), newUser(), newUser()])
    await makeAdmin(admin)
    await report(reporter, target)

    await rest('DELETE', `profile_reports?profile_id=eq.${target.id}`, reporter.token)
    expect(await readAsService('profile_reports', `profile_id=eq.${target.id}`)).toBeDefined()

    await rest('DELETE', `profile_reports?profile_id=eq.${target.id}`, admin.token)
    expect(await readAsService('profile_reports', `profile_id=eq.${target.id}`)).toBeUndefined()
  })
})
