/**
 * Lo que las pantallas del blog necesitan saber y no es un componente.
 *
 * Vive separado de `pages/Blog.tsx` por una razón práctica: un archivo que
 * exporta componentes y funciones al mismo tiempo rompe el fast refresh de
 * Vite, y `BlogPost` necesita estas dos funciones tanto como el listado.
 */

/**
 * Las portadas se levantan solas, con el nombre del slug del artículo — igual
 * que los logos de las marcas en la portada.
 *
 * Poner una foto es dejar el archivo en `src/assets/blog/<slug>.jpg`. No hay
 * que declararla en `posts.ts` ni tocar ningún componente, y el build le pone
 * el hash y la sirve optimizada.
 */
const covers = import.meta.glob('../assets/blog/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export function coverFor(slug: string): string | null {
  const match = Object.entries(covers).find(([path]) => {
    const file = path.split('/').pop() ?? ''
    return file.replace(/\.(jpg|jpeg|png|webp|avif)$/, '') === slug
  })
  return match ? match[1] : null
}

/**
 * Fecha larga, que es la que se lee arriba de un artículo.
 *
 * El mediodía no es un capricho: `new Date('2026-09-15')` se interpreta como
 * medianoche UTC, y en Argentina eso es el día anterior a las 21. La nota
 * saldría fechada un día antes de lo que dice el archivo.
 */
export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
