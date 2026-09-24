/**
 * Los autos que miraste, guardados en este navegador.
 *
 * Sin cuenta y sin base: es una lista de slugs en `localStorage`, igual que los
 * favoritos de quien no se registró. Buscar un auto lleva varias vueltas ---se
 * mira uno, se vuelve, se mira otro--- y volver a encontrar el que gustó es lo
 * que más se pierde en el camino, sobre todo desde el celular.
 *
 * Guarda slugs y no autos: el precio puede cambiar, el aviso puede pausarse, y
 * lo que se muestra tiene que ser el estado de ahora. Los slugs se cambian por
 * autos al mostrarlos; los que ya no existen, la consulta no los devuelve y
 * desaparecen solos.
 *
 * La parte de acá no toca el navegador: son funciones sobre una lista, para
 * poder probarlas.
 */

/** Cuántos se recuerdan. Dos filas en el celular, una en escritorio. */
export const MAX_RECENT = 8

const CLAVE = 'auteando:vistos'

/** El slug más reciente primero, sin repetidos y con el tope aplicado. */
export function pushRecent(list: readonly string[], slug: string, max = MAX_RECENT): string[] {
  if (!slug) return [...list]
  return [slug, ...list.filter((item) => item !== slug)].slice(0, max)
}

/**
 * Lo guardado, limpio: sólo textos, sin repetidos y hasta el tope.
 *
 * Lo que hay en `localStorage` lo puede escribir cualquiera ---la consola del
 * navegador, una extensión, una versión anterior del sitio--- así que se
 * valida en vez de confiar. Un valor raro no puede tirar abajo la pantalla.
 */
export function parseRecent(raw: string | null, max = MAX_RECENT): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    const slugs = value.filter((item): item is string => typeof item === 'string' && item !== '')
    return [...new Set(slugs)].slice(0, max)
  } catch {
    return []
  }
}

/** Lee del navegador. Vacío si el almacenamiento está bloqueado. */
export function readRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(CLAVE))
  } catch {
    return []
  }
}

/** Anota un auto y devuelve la lista nueva. */
export function rememberRecent(slug: string): string[] {
  const next = pushRecent(readRecent(), slug)
  try {
    localStorage.setItem(CLAVE, JSON.stringify(next))
  } catch {
    /* Modo privado o almacenamiento lleno: se pierde el historial y nada más. */
  }
  return next
}
