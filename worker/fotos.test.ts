import { describe, expect, it } from 'vitest'
import wranglerRaw from '../wrangler.jsonc?raw'
import { FOTOS_URL } from '../src/config/fotos'
import { apiFotos, cacheDe, esDeSuCarpeta, rutaValida, TAMANO_MAXIMO, type Almacen } from './fotos'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'

/** Un R2 en memoria, con lo justo para que el endpoint funcione. */
function r2Falso() {
  const objetos = new Map<string, { contentType: string; cacheControl: string; size: number }>()
  const almacen: Almacen = {
    async head(key) {
      return objetos.get(key) ?? null
    },
    async put(key, value, options) {
      objetos.set(key, { ...options.httpMetadata, size: value.byteLength })
      return {}
    },
    async delete(keys) {
      for (const key of keys) objetos.delete(key)
    },
    async list({ prefix, delimiter }) {
      const carpetas = new Set<string>()
      const sueltos: { key: string }[] = []
      for (const key of objetos.keys()) {
        if (!key.startsWith(prefix)) continue
        const resto = key.slice(prefix.length)
        const corte = resto.indexOf(delimiter)
        if (corte === -1) sueltos.push({ key })
        else carpetas.add(prefix + resto.slice(0, corte + 1))
      }
      return { objects: sueltos, delimitedPrefixes: [...carpetas], truncated: false }
    },
  }
  return { almacen, objetos }
}

/* El token "bueno" es de YO, el "ajeno" de OTRO; cualquier otro no vale. */
const verificar = async (token: string) => (token === 'bueno' ? YO : token === 'ajeno' ? OTRO : null)

function pedido(method: string, path: string, init: { token?: string; body?: BodyInit; headers?: Record<string, string> } = {}) {
  const url = new URL(`https://auteando.com${path}`)
  const headers = new Headers(init.headers)
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`)
  return { request: new Request(url, { method, headers, body: init.body }), url }
}

const foto = () => new Uint8Array([1, 2, 3, 4])

async function subir(almacen: Almacen, path: string, token = 'bueno', extra: Record<string, string> = {}) {
  const { request, url } = pedido('PUT', `/api/fotos/listing-photos/${path}`, {
    token,
    body: foto(),
    headers: { 'Content-Type': 'image/webp', ...extra },
  })
  return apiFotos(request, url, almacen, verificar)
}

describe('las rutas', () => {
  it('acepta las que arma la aplicación', () => {
    expect(rutaValida(`${YO}/abc-123/0-x1y2z3.webp`)).toBe(true)
    expect(rutaValida(`${YO}/avatar/profile-1727000000000.jpg`)).toBe(true)
    expect(rutaValida(`${YO}/primer-auto.webp`)).toBe(true)
  })

  it('rechaza las que intentan salir de la carpeta', () => {
    expect(rutaValida(`${YO}/../${OTRO}/x.webp`)).toBe(false)
    expect(rutaValida(`${YO}//x.webp`)).toBe(false)
    expect(rutaValida(`/${YO}/x.webp`)).toBe(false)
    expect(rutaValida(`${YO}/.oculto`)).toBe(false)
    expect(rutaValida(`${YO}/con espacio.webp`)).toBe(false)
  })

  it('la carpeta es la primera parte de la ruta, y tiene que haber algo adentro', () => {
    expect(esDeSuCarpeta(`${YO}/x.webp`, YO)).toBe(true)
    expect(esDeSuCarpeta(`${OTRO}/x.webp`, YO)).toBe(false)
    expect(esDeSuCarpeta(YO, YO)).toBe(false)
  })
})

describe('subir', () => {
  it('guarda en la carpeta propia, con el tipo y la caché', async () => {
    const { almacen, objetos } = r2Falso()
    const response = await subir(almacen, `${YO}/aviso/0-abc.webp`)
    expect(response.status).toBe(200)
    expect(objetos.get(`listing-photos/${YO}/aviso/0-abc.webp`)).toEqual({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      size: 4,
    })
  })

  it('sin sesión, no', async () => {
    const { almacen, objetos } = r2Falso()
    expect((await subir(almacen, `${YO}/x.webp`, '')).status).toBe(401)
    expect((await subir(almacen, `${YO}/x.webp`, 'vencido')).status).toBe(401)
    expect(objetos.size).toBe(0)
  })

  it('en la carpeta de otro, no', async () => {
    const { almacen, objetos } = r2Falso()
    expect((await subir(almacen, `${OTRO}/x.webp`)).status).toBe(403)
    expect(objetos.size).toBe(0)
  })

  it('lo que no es una foto, no', async () => {
    const { almacen } = r2Falso()
    const response = await subir(almacen, `${YO}/x.html`, 'bueno', { 'Content-Type': 'text/html' })
    expect(response.status).toBe(415)
  })

  it('una foto enorme, no', async () => {
    const { almacen } = r2Falso()
    const { request, url } = pedido('PUT', `/api/fotos/listing-photos/${YO}/x.webp`, {
      token: 'bueno',
      body: new Uint8Array(TAMANO_MAXIMO + 1),
      headers: { 'Content-Type': 'image/webp' },
    })
    expect((await apiFotos(request, url, almacen, verificar)).status).toBe(413)
  })

  it('no pisa una foto existente salvo que se pida', async () => {
    const { almacen } = r2Falso()
    await subir(almacen, `${YO}/x.webp`)
    expect((await subir(almacen, `${YO}/x.webp`)).status).toBe(409)
    expect((await subir(almacen, `${YO}/x.webp`, 'bueno', { 'x-upsert': 'true' })).status).toBe(200)
  })

  it('un bucket que no existe, no', async () => {
    const { almacen } = r2Falso()
    const { request, url } = pedido('PUT', `/api/fotos/secretos/${YO}/x.webp`, {
      token: 'bueno',
      body: foto(),
      headers: { 'Content-Type': 'image/webp' },
    })
    expect((await apiFotos(request, url, almacen, verificar)).status).toBe(404)
  })

  it('sin R2 conectado contesta que no está, en vez de romperse', async () => {
    const { request, url } = pedido('PUT', `/api/fotos/listing-photos/${YO}/x.webp`, { token: 'bueno' })
    expect((await apiFotos(request, url, undefined, verificar)).status).toBe(503)
  })
})

describe('borrar', () => {
  it('borra lo propio e ignora lo ajeno, como Storage', async () => {
    const { almacen, objetos } = r2Falso()
    await subir(almacen, `${YO}/a.webp`)
    await subir(almacen, `${OTRO}/b.webp`, 'ajeno')

    const { request, url } = pedido('DELETE', '/api/fotos/listing-photos', {
      token: 'bueno',
      body: JSON.stringify({ paths: [`${YO}/a.webp`, `${OTRO}/b.webp`] }),
    })
    const response = await apiFotos(request, url, almacen, verificar)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ name: `${YO}/a.webp` }])
    expect([...objetos.keys()]).toEqual([`listing-photos/${OTRO}/b.webp`])
  })
})

describe('listar', () => {
  it('devuelve archivos y carpetas con la forma de Storage', async () => {
    const { almacen } = r2Falso()
    await subir(almacen, `${YO}/aviso/0-a.webp`)
    await subir(almacen, `${YO}/avatar/profile-1.jpg`, 'bueno', { 'Content-Type': 'image/jpeg' })
    await subir(almacen, `${YO}/suelta.webp`)

    const { request, url } = pedido('GET', `/api/fotos/listing-photos?prefix=${YO}`, { token: 'bueno' })
    const entradas = (await (await apiFotos(request, url, almacen, verificar)).json()) as {
      name: string
      id: string | null
    }[]
    expect(entradas.filter((e) => e.id === null).map((e) => e.name).sort()).toEqual(['avatar', 'aviso'])
    expect(entradas.filter((e) => e.id !== null).map((e) => e.name)).toEqual(['suelta.webp'])
  })

  it('no deja listar la carpeta de otro', async () => {
    const { almacen } = r2Falso()
    const { request, url } = pedido('GET', `/api/fotos/listing-photos?prefix=${OTRO}`, { token: 'bueno' })
    expect((await apiFotos(request, url, almacen, verificar)).status).toBe(403)
  })
})

describe('la caché', () => {
  it('las del garage se pisan con el mismo nombre, así que duran poco', () => {
    expect(cacheDe('garage-photos')).toBe('public, max-age=3600')
    expect(cacheDe('listing-photos')).toContain('immutable')
  })
})

/**
 * Prender `FOTOS_URL` sin el bucket conectado al worker deja las fotos a la
 * vista pero sin forma de subir ninguna: cada foto nueva contesta 503. Pasa
 * justo en el orden equivocado de los pasos de `config/fotos`, así que se
 * comprueba acá, antes del deploy.
 */
describe('el interruptor y el bucket', () => {
  it('con FOTOS_URL prendida, el worker tiene el bucket conectado', () => {
    const config = JSON.parse(wranglerRaw.replace(/^\s*\/\/.*$/gm, '')) as {
      r2_buckets?: { binding: string; bucket_name: string }[]
    }
    const conectado = (config.r2_buckets ?? []).some((b) => b.binding === 'FOTOS')
    if (FOTOS_URL) expect(conectado).toBe(true)
    else expect(FOTOS_URL).toBeNull()
  })
})
