/**
 * Dónde viven las fotos: el interruptor entre Supabase Storage y Cloudflare R2.
 *
 * Con `null` todo sigue como siempre: se sube, se lista, se borra y se lee en
 * Supabase. Con una URL, las fotos se sirven desde ese dominio (un bucket de R2
 * con dominio propio) y se escriben a través del worker, en `/api/fotos`.
 *
 * Por qué R2: el plan gratis de Supabase da 5 GB de salida por mes, y casi toda
 * la salida son fotos. Un listado con veinte avisos es cerca de 1 MB, así que
 * los 5 GB se van en unas 5.000 visitas. R2 no cobra la salida, y leer desde
 * su dominio propio tampoco pasa por el worker, que tiene su propio límite
 * diario.
 *
 * El orden para prenderlo importa, igual que con `CANONICAL_HOST`: primero el
 * bucket con su dominio, después copiar las fotos que ya existen
 * (`npm run fotos:copiar`), y recién ahí poner la URL. Prendido antes, todas
 * las fotos publicadas se ven rotas.
 */
export const FOTOS_URL: string | null = null

/**
 * Los buckets que existen. Dentro de R2 son la primera carpeta de la clave
 * (`listing-photos/<usuario>/…`), así las rutas guardadas en la base no
 * cambian: la misma ruta vale en los dos lados.
 */
export const BUCKETS_DE_FOTOS = ['listing-photos', 'garage-photos'] as const
export type BucketDeFotos = (typeof BUCKETS_DE_FOTOS)[number]

/** La URL pública de una foto en R2. */
export function urlDeFotoEnR2(base: string, bucket: string, path: string): string {
  const ruta = path
    .split('/')
    .map((parte) => encodeURIComponent(parte))
    .join('/')
  return `${base.replace(/\/+$/, '')}/${bucket}/${ruta}`
}
