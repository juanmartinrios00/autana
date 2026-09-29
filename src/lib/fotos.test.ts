import { describe, expect, it } from 'vitest'
import { almacenR2 } from './fotos'

interface Llamada {
  url: string
  method: string
  headers: Headers
  body: unknown
}

/** Un fetch que anota lo que le piden y contesta lo que se le diga. */
function fetchFalso(respuesta: () => Response) {
  const llamadas: Llamada[] = []
  const pedir = (async (input: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: init?.body,
    })
    return respuesta()
  }) as typeof fetch
  return { pedir, llamadas }
}

const ok = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200 })
const conSesion = async () => 'token-de-sesion'

describe('almacenR2', () => {
  it('sube con el token, el tipo y la ruta codificada', async () => {
    const { pedir, llamadas } = fetchFalso(ok({ path: 'u/a b.webp' }))
    const almacen = almacenR2('https://fotos.auteando.com', conSesion, '/api/fotos', pedir)
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' })

    const { error } = await almacen.from('listing-photos').upload('u/a b.webp', blob, { upsert: true })

    expect(error).toBeNull()
    expect(llamadas[0]!.url).toBe('/api/fotos/listing-photos/u/a%20b.webp')
    expect(llamadas[0]!.method).toBe('PUT')
    expect(llamadas[0]!.headers.get('Authorization')).toBe('Bearer token-de-sesion')
    expect(llamadas[0]!.headers.get('Content-Type')).toBe('image/webp')
    expect(llamadas[0]!.headers.get('x-upsert')).toBe('true')
  })

  it('sin upsert no manda el permiso de pisar', async () => {
    const { pedir, llamadas } = fetchFalso(ok({ path: 'u/x.jpg' }))
    const almacen = almacenR2('https://f', conSesion, '/api/fotos', pedir)
    await almacen.from('listing-photos').upload('u/x.jpg', new Blob([]), { contentType: 'image/jpeg' })
    expect(llamadas[0]!.headers.get('x-upsert')).toBeNull()
    expect(llamadas[0]!.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('un error del worker vuelve como `error`, con su mensaje, y no como excepción', async () => {
    const { pedir } = fetchFalso(() => new Response(JSON.stringify({ message: 'La foto es demasiado grande.' }), { status: 413 }))
    const almacen = almacenR2('https://f', conSesion, '/api/fotos', pedir)
    const { data, error } = await almacen.from('listing-photos').upload('u/x.webp', new Blob([]))
    expect(data).toBeNull()
    expect(error?.message).toBe('La foto es demasiado grande.')
  })

  it('una red caída también vuelve como `error`', async () => {
    const pedir = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    const almacen = almacenR2('https://f', conSesion, '/api/fotos', pedir)
    const { error } = await almacen.from('listing-photos').remove(['u/x.webp'])
    expect(error?.message).toBe('Failed to fetch')
  })

  it('sin sesión ni lo intenta', async () => {
    const { pedir, llamadas } = fetchFalso(ok([]))
    const almacen = almacenR2('https://f', async () => null, '/api/fotos', pedir)
    const { error } = await almacen.from('listing-photos').list('u')
    expect(error).not.toBeNull()
    expect(llamadas).toHaveLength(0)
  })

  it('borra mandando la lista en el cuerpo', async () => {
    const { pedir, llamadas } = fetchFalso(ok([{ name: 'u/x.webp' }]))
    const almacen = almacenR2('https://f', conSesion, '/api/fotos', pedir)
    const { data } = await almacen.from('garage-photos').remove(['u/x.webp'])
    expect(data).toEqual([{ name: 'u/x.webp' }])
    expect(llamadas[0]!.url).toBe('/api/fotos/garage-photos')
    expect(llamadas[0]!.method).toBe('DELETE')
    expect(JSON.parse(llamadas[0]!.body as string)).toEqual({ paths: ['u/x.webp'] })
  })

  it('lista una carpeta', async () => {
    const { pedir, llamadas } = fetchFalso(ok([{ name: 'avatar', id: null }]))
    const almacen = almacenR2('https://f', conSesion, '/api/fotos', pedir)
    const { data } = await almacen.from('listing-photos').list('u/avatar', { limit: 1000 })
    expect(data).toEqual([{ name: 'avatar', id: null }])
    expect(llamadas[0]!.url).toBe('/api/fotos/listing-photos?prefix=u%2Favatar')
  })

  it('la URL pública es la del dominio del bucket, sin pasar por el worker', () => {
    const almacen = almacenR2('https://fotos.auteando.com/', conSesion)
    expect(almacen.from('listing-photos').getPublicUrl('u/aviso/0-a.webp').data.publicUrl).toBe(
      'https://fotos.auteando.com/listing-photos/u/aviso/0-a.webp',
    )
  })
})
