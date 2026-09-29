/**
 * Las fotos en R2, con la misma forma que el cliente de Supabase Storage.
 *
 * La aplicación usa cuatro cosas de Storage: subir, borrar, listar una carpeta
 * y armar la URL pública. Este objeto hace esas cuatro contra `/api/fotos` del
 * worker (ver `worker/fotos`), con las mismas firmas y los mismos `{ data,
 * error }`. Así el cambio de un lado al otro es una línea en `lib/supabase` y
 * ningún lugar que sube o borra fotos se entera.
 */

import { urlDeFotoEnR2 } from '../config/fotos'

type Resultado<T> = Promise<{ data: T; error: null } | { data: null; error: Error }>

export interface CarpetaDeFotos {
  upload(path: string, body: Blob, options?: { contentType?: string; upsert?: boolean }): Resultado<{ path: string }>
  remove(paths: string[]): Resultado<{ name: string }[]>
  list(prefix?: string, options?: { limit?: number }): Resultado<{ name: string; id: string | null }[]>
  getPublicUrl(path: string): { data: { publicUrl: string } }
}

export interface AlmacenDeFotos {
  from(bucket: string): CarpetaDeFotos
}

/** Un error con el mensaje que mandó el worker, o uno genérico. */
async function errorDe(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string') return new Error(body.message)
  } catch {
    /* El cuerpo no era JSON: va el genérico. */
  }
  return new Error(`No se pudo guardar la foto (${response.status}).`)
}

function rutaCodificada(path: string): string {
  return path
    .split('/')
    .map((parte) => encodeURIComponent(parte))
    .join('/')
}

/**
 * @param base De dónde se leen las fotos: el dominio propio del bucket.
 * @param token El token de la sesión, o `null` sin sesión.
 * @param api Dónde está el worker. En el sitio es el mismo origen.
 */
export function almacenR2(
  base: string,
  token: () => Promise<string | null>,
  api = '/api/fotos',
  pedir: typeof fetch = (...args) => fetch(...args),
): AlmacenDeFotos {
  async function llamar<T>(method: string, ruta: string, init: RequestInit = {}): Resultado<T> {
    try {
      const sesion = await token()
      if (!sesion) return { data: null, error: new Error('Hace falta iniciar sesión.') }
      const headers = new Headers(init.headers)
      headers.set('Authorization', `Bearer ${sesion}`)
      const response = await pedir(`${api}/${ruta}`, { ...init, method, headers })
      if (!response.ok) return { data: null, error: await errorDe(response) }
      return { data: (await response.json()) as T, error: null }
    } catch (cause) {
      return { data: null, error: cause instanceof Error ? cause : new Error(String(cause)) }
    }
  }

  return {
    from(bucket) {
      return {
        upload(path, body, options = {}) {
          const headers: Record<string, string> = {
            'Content-Type': options.contentType || body.type || 'application/octet-stream',
          }
          if (options.upsert) headers['x-upsert'] = 'true'
          return llamar(`PUT`, `${bucket}/${rutaCodificada(path)}`, { body, headers })
        },
        remove(paths) {
          return llamar('DELETE', bucket, {
            body: JSON.stringify({ paths }),
            headers: { 'Content-Type': 'application/json' },
          })
        },
        list(prefix = '') {
          return llamar('GET', `${bucket}?prefix=${encodeURIComponent(prefix)}`)
        },
        getPublicUrl(path) {
          return { data: { publicUrl: urlDeFotoEnR2(base, bucket, path) } }
        },
      }
    },
  }
}
