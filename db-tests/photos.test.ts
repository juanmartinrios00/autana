import { describe, expect, it } from 'vitest'
import { newUser, type TestUser } from './helpers'

/**
 * Las fotos: que cada uno pueda borrar las suyas, que nadie pueda borrar las de
 * otro, y que borrada signifique borrada — que el link público deje de andar.
 *
 * Esto es lo que sostiene la limpieza de fotos huérfanas: corre desde el
 * cliente de cada persona, así que depende de que Storage le deje borrar su
 * propia carpeta y nada más.
 */

const URL_BASE = process.env.DB_TEST_URL!
const ANON = process.env.DB_TEST_ANON_KEY!

/* Un PNG de 1×1, lo más chico que Storage acepta como imagen. */
const PIXEL = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
)

async function upload(user: TestUser, bucket: string, path: string): Promise<number> {
  const response = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${user.token}`, 'Content-Type': 'image/png' },
    body: PIXEL,
  })
  return response.status
}

async function remove(user: TestUser, bucket: string, path: string): Promise<void> {
  await fetch(`${URL_BASE}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: { apikey: ANON, Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  })
}

async function publicStatus(bucket: string, path: string): Promise<number> {
  const response = await fetch(`${URL_BASE}/storage/v1/object/public/${bucket}/${path}`)
  return response.status
}

describe.each([
  ['la foto de perfil', 'listing-photos', (id: string) => `${id}/avatar/profile-1.png`],
  ['la foto de un auto del garage', 'garage-photos', (id: string) => `${id}/first.png`],
])('%s', (_label, bucket, pathFor) => {
  it('borrada, el link público deja de andar', async () => {
    const user = await newUser()
    const path = pathFor(user.id)

    expect(await upload(user, bucket, path)).toBeLessThan(300)
    expect(await publicStatus(bucket, path)).toBe(200)

    await remove(user, bucket, path)
    expect(await publicStatus(bucket, path)).toBeGreaterThanOrEqual(400)
  })

  it('nadie puede borrar la de otro', async () => {
    const [owner, other] = await Promise.all([newUser(), newUser()])
    const path = pathFor(owner.id)
    await upload(owner, bucket, path)

    await remove(other, bucket, path)
    expect(await publicStatus(bucket, path)).toBe(200)
  })

  it('nadie puede subir a la carpeta de otro', async () => {
    const [owner, other] = await Promise.all([newUser(), newUser()])
    expect(await upload(other, bucket, pathFor(owner.id))).toBeGreaterThanOrEqual(400)
  })
})
