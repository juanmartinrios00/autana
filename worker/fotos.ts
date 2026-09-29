/**
 * `/api/fotos`: subir, borrar y listar fotos en R2 en nombre de alguien.
 *
 * Es el reemplazo de las políticas de Supabase Storage, y dice exactamente lo
 * mismo que ellas: cualquiera lee, y cada cuenta escribe y borra sólo adentro
 * de su carpeta, la que se llama como su id (`storage.foldername(name)[1] =
 * auth.uid()`). La lectura no pasa por acá: las fotos se sirven del dominio
 * propio del bucket, sin gastar invocaciones del worker.
 *
 * Quién es la persona lo dice Supabase, no este código: el token de la sesión
 * se manda a `/auth/v1/user`, que contesta con el usuario sólo si el token es
 * válido y no venció. Verificar la firma acá sería otra copia de la lógica de
 * autenticación, y la que se desactualiza es siempre la copia.
 *
 * Mismo criterio que Storage con lo ajeno: borrar una ruta de otra carpeta no
 * es un error, se ignora. Así un cliente que manda una lista mezclada borra lo
 * suyo y nada más, igual que antes.
 */

import { BUCKETS_DE_FOTOS } from '../src/config/fotos'

/** Lo que usa este módulo de R2. Se declara acá para poder probarlo sin R2. */
export interface Almacen {
  head(key: string): Promise<unknown | null>
  put(
    key: string,
    value: ArrayBuffer,
    options: { httpMetadata: { contentType: string; cacheControl: string } },
  ): Promise<unknown>
  delete(keys: string[]): Promise<void>
  list(options: { prefix: string; delimiter: string; limit: number; cursor?: string }): Promise<{
    objects: { key: string }[]
    delimitedPrefixes: string[]
    truncated: boolean
    cursor?: string
  }>
}

/** Devuelve el id del usuario dueño del token, o `null` si no vale. */
export type Verificador = (token: string) => Promise<string | null>

const TIPOS = new Set(['image/webp', 'image/jpeg', 'image/png'])

/** El avatar admite hasta 5 MB sin comprimir; lo demás llega en WebP y pesa mucho menos. */
export const TAMANO_MAXIMO = 6 * 1024 * 1024

/**
 * Letras, números, punto, guion y guion bajo, en tramos separados por barras.
 * Es todo lo que generan las rutas de la aplicación
 * (`<usuario>/<aviso>/0-a1b2c3.webp`), y deja afuera `..`, barras dobles y
 * cualquier cosa que alguien pueda querer colar en una clave.
 */
const TRAMO = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,120}$/

export function rutaValida(path: string): boolean {
  if (path.length === 0 || path.length > 400) return false
  return path.split('/').every((tramo) => TRAMO.test(tramo) && tramo !== '..')
}

/** ¿La ruta está adentro de la carpeta de este usuario? */
export function esDeSuCarpeta(path: string, userId: string): boolean {
  return rutaValida(path) && path.split('/')[0] === userId && path.includes('/')
}

/**
 * Cuánto se puede cachear cada foto.
 *
 * Las de los avisos y los avatares llevan algo al azar o la hora en el nombre:
 * si cambian, cambia la ruta, y se pueden guardar un año sin preguntar. Las del
 * garage se llaman como la consigna (`<usuario>/primer-auto.webp`) y se pisan
 * al cambiar la foto: con un año, quien cambia la foto seguiría viendo la
 * vieja. Una hora es lo mismo que hacía Supabase.
 */
export function cacheDe(bucket: string): string {
  return bucket === 'garage-photos' ? 'public, max-age=3600' : 'public, max-age=31536000, immutable'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function falla(status: number, message: string): Response {
  return json({ message }, status)
}

const PREFIJO = /^\/api\/fotos\/([a-z-]+)(?:\/(.+))?$/

export async function apiFotos(
  request: Request,
  url: URL,
  almacen: Almacen | undefined,
  verificar: Verificador,
): Promise<Response> {
  if (!almacen) return falla(503, 'Las fotos todavía no están en R2.')

  const match = url.pathname.match(PREFIJO)
  const bucket = match?.[1]
  if (!bucket || !(BUCKETS_DE_FOTOS as readonly string[]).includes(bucket)) {
    return falla(404, 'No existe ese bucket.')
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const userId = token ? await verificar(token) : null
  if (!userId) return falla(401, 'Hace falta iniciar sesión.')

  const path = match?.[2] ? decodeURIComponent(match[2]) : ''

  if (request.method === 'PUT') {
    if (!esDeSuCarpeta(path, userId)) return falla(403, 'Sólo podés subir fotos a tu carpeta.')

    const tipo = (request.headers.get('Content-Type') ?? '').split(';')[0]!.trim()
    if (!TIPOS.has(tipo)) return falla(415, 'Formato de foto no permitido.')

    const declarado = Number(request.headers.get('Content-Length') ?? '0')
    if (declarado > TAMANO_MAXIMO) return falla(413, 'La foto es demasiado grande.')

    const cuerpo = await request.arrayBuffer()
    if (cuerpo.byteLength === 0) return falla(400, 'La foto llegó vacía.')
    if (cuerpo.byteLength > TAMANO_MAXIMO) return falla(413, 'La foto es demasiado grande.')

    const key = `${bucket}/${path}`
    if (request.headers.get('x-upsert') !== 'true' && (await almacen.head(key))) {
      return falla(409, 'Ya hay una foto con ese nombre.')
    }

    await almacen.put(key, cuerpo, { httpMetadata: { contentType: tipo, cacheControl: cacheDe(bucket) } })
    return json({ path })
  }

  if (request.method === 'DELETE') {
    if (path) return falla(400, 'Las rutas a borrar van en el cuerpo.')
    let paths: unknown
    try {
      paths = ((await request.json()) as { paths?: unknown }).paths
    } catch {
      return falla(400, 'Falta la lista de fotos.')
    }
    if (!Array.isArray(paths) || paths.length > 1000) return falla(400, 'Falta la lista de fotos.')

    const suyas = paths.filter((p): p is string => typeof p === 'string' && esDeSuCarpeta(p, userId))
    if (suyas.length > 0) await almacen.delete(suyas.map((p) => `${bucket}/${p}`))
    return json(suyas.map((name) => ({ name })))
  }

  if (request.method === 'GET') {
    /* Listar sólo la propia carpeta: lo usan la limpieza de huérfanas y el
       borrado de la cuenta, que son siempre de uno. */
    const prefix = (url.searchParams.get('prefix') ?? '').replace(/\/+$/, '')
    if (!(prefix === userId || esDeSuCarpeta(prefix, userId))) {
      return falla(403, 'Sólo podés listar tu carpeta.')
    }

    const base = `${bucket}/${prefix}/`
    const entradas: { name: string; id: string | null }[] = []
    let cursor: string | undefined
    do {
      const pagina = await almacen.list({ prefix: base, delimiter: '/', limit: 1000, cursor })
      /* Mismo formato que Storage: las carpetas vienen con `id` en null, que
         es como las distingue quien lista. */
      for (const carpeta of pagina.delimitedPrefixes) {
        entradas.push({ name: carpeta.slice(base.length).replace(/\/$/, ''), id: null })
      }
      for (const objeto of pagina.objects) {
        entradas.push({ name: objeto.key.slice(base.length), id: objeto.key })
      }
      cursor = pagina.truncated ? pagina.cursor : undefined
    } while (cursor && entradas.length < 5000)

    return json(entradas)
  }

  return falla(405, 'Método no permitido.')
}
