/**
 * Las rutas y las listas que el Worker usa para decidir, sin lógica adentro.
 *
 * Están acá y no en `index.ts` por una exigencia del runtime: todo lo que el
 * archivo de entrada exporta con nombre, workerd lo trata como un punto de
 * entrada más y pide que sea una función o un manejador. Una expresión regular
 * o un arreglo no lo son, así que `wrangler dev` no levantaba:
 *
 *   Incorrect type for map entry 'CANONICAL_HOST': the provided value is not
 *   of type 'function or ExportedHandler'.
 *
 * El deploy las aceptaba igual, pero sin poder correr el Worker en la máquina
 * no hay forma de comprobar lo que hace antes de publicarlo. Los tests las
 * importan de acá.
 */

/**
 * El slug se interpola en un filtro de PostgREST, así que se acota antes de
 * usarlo. Lo que no entre en este patrón no es un slug nuestro: los generamos
 * con letras, números y guiones.
 */
export const LISTING_URL = /^\/autos\/([A-Za-z0-9-]{1,120})\/?$/
export const BLOG_URL = /^\/blog\/([a-z0-9-]{1,120})\/?$/

/**
 * El garage se direcciona por el uuid del usuario, así que se exige la forma
 * exacta de un uuid. Mismo motivo que el slug: se interpola en un filtro.
 */
export const GARAGE_URL =
  /^\/g\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/?$/

/**
 * Las pantallas que no van al buscador: las que piden sesión, las que no
 * tienen contenido propio y las que sólo tienen sentido para quien las abre.
 *
 * Se exporta junto con `STATIC_PAGES` para que un test pueda cruzarlas. Las dos
 * listas dicen cosas opuestas sobre las mismas URLs, y una pagina que caiga en
 * las dos es una contradiccion que Google resuelve solo y a su criterio: el
 * sitemap la ofrece y el robots la prohibe.
 */
export const DISALLOWED = [
  '/entrar',
  '/vender',
  '/perfil',
  '/mis-avisos',
  '/favoritos',
  '/ajustes',
  '/admin',
  '/comparar',
  '/recuperar',
  '/gente',
  '/siguiendo',
  '/garage/mio',
  '/novedades',
]

/** Las publicas con contenido propio, que van fijas al sitemap. */
export const STATIC_PAGES = [
  '/',
  '/autos',
  '/explorar',
  '/garage',
  '/blog',
  '/ayuda',
  '/agencias',
  '/niveles',
  '/contacto',
  '/terminos',
  '/privacidad',
]

/**
 * El dominio bueno. `null` apaga la redirección.
 *
 * Prendido el 20/9/2026, recién después de atar `auteando.com` al Worker en
 * Cloudflare y de comprobar que servía el sitio con su certificado. Ese orden
 * es el único que hay: prendido antes de que el dominio resuelva, el sitio se
 * redirige a un lugar que todavía no existe y queda caído para todo el mundo.
 */
export const CANONICAL_HOST: string | null = 'auteando.com'

/**
 * Las rutas viejas, en inglés, y su equivalente de ahora.
 *
 * Ninguna de las nuevas empieza con una de las viejas, asi que no hay forma de
 * entrar en un bucle. Hay un test que lo sostiene, porque es la clase de cosa
 * que se rompe agregando una ruta un año despues.
 */
export const RUTAS_VIEJAS: Record<string, string> = {
  '/cars': '/autos',
  '/sell': '/vender',
  '/favorites': '/favoritos',
  '/my-listings': '/mis-avisos',
  '/settings': '/ajustes',
  '/compare': '/comparar',
  '/login': '/entrar',
  '/reset': '/recuperar',
  '/levels': '/niveles',
  '/dealers': '/agencias',
  '/help': '/ayuda',
  '/contact': '/contacto',
  '/terms': '/terminos',
  '/privacy': '/privacidad',
  '/profile': '/perfil',
}
