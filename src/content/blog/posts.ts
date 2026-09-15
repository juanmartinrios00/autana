/**
 * Los artículos del blog: metadatos.
 *
 * Están separados del cuerpo a propósito, y en TypeScript plano sin JSX. El
 * Worker importa este archivo para armar el título y la descripción que leen
 * Google y WhatsApp, y el Worker no puede importar React: si acá hubiera JSX,
 * el bundle del Worker se llevaría la aplicación entera adentro.
 *
 * El cuerpo de cada uno vive en `bodies.tsx`, indexado por el mismo `slug`.
 * Que las dos listas coincidan lo verifica un test, porque olvidarse de uno de
 * los dos lados no rompe nada visible hasta que alguien abre el artículo.
 *
 * El orden de este array no importa: las pantallas ordenan por fecha.
 */

export interface PostMeta {
  /** Lo que va en la URL: `/blog/<slug>`. No se cambia una vez publicado. */
  slug: string
  title: string
  /** Un párrafo. Es lo que sale en la tarjeta del listado y en el preview. */
  summary: string
  /** ISO, la fecha de publicación. */
  date: string
  /** Para agrupar de un vistazo. Pocas y repetidas, no una por artículo. */
  tag: string
  /** Minutos de lectura, a ojo. Nadie cronometra; sirve para saber si entra. */
  minutes: number
}

export const posts: PostMeta[] = [
  {
    slug: 'transferir-un-auto-en-argentina',
    title: 'Cómo transferir un auto en Argentina: papeles, costos y plazos',
    summary:
      'La transferencia es el único momento en que el auto deja de ser legalmente tuyo. Qué formularios se firman, cuánto sale, quién paga qué, y por qué conviene no salir del registro sin el comprobante.',
    date: '2026-09-15',
    tag: 'Trámites',
    minutes: 7,
  },
  {
    slug: 'que-mirar-antes-de-comprar-un-usado',
    title: 'Qué mirar antes de comprar un usado, en orden',
    summary:
      'Una revisión que se puede hacer en veinte minutos y sin levantar el auto. Qué mirar primero, qué se arregla barato, qué es motivo para irse, y qué hacer antes de dejar una seña.',
    date: '2026-09-12',
    tag: 'Comprar',
    minutes: 9,
  },
  {
    slug: 'ponerle-precio-a-tu-auto',
    title: 'Cómo ponerle precio a tu auto sin regalarlo ni espantar a nadie',
    summary:
      'El precio decide si tu aviso lo miran o no. Cómo se arma un precio con lo que ya está publicado, por qué el primer mes es el que más importa, y qué hacer cuando no entra ni una consulta.',
    date: '2026-09-08',
    tag: 'Vender',
    minutes: 6,
  },
  {
    slug: 'estafas-al-comprar-o-vender-un-auto',
    title: 'Las estafas más comunes al comprar o vender un auto',
    summary:
      'Casi todas empiezan igual: alguien con apuro que quiere sacar la operación del lugar donde se puede verificar. Cómo se arman, en qué momento aparecen, y la regla que las corta a todas.',
    date: '2026-09-03',
    tag: 'Seguridad',
    minutes: 8,
  },
]

/** Los artículos del más nuevo al más viejo, que es como se leen. */
export function postsByDate(): PostMeta[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date))
}

export function findPost(slug: string): PostMeta | undefined {
  return posts.find((post) => post.slug === slug)
}
