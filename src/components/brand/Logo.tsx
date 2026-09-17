import type { SVGProps } from 'react'

/**
 * El logotipo y el símbolo de la marca, dibujados.
 *
 * Son trazos vectoriales, no texto en una fuente: el logotipo tiene geometría
 * propia y no existe como tipografía que se pueda instalar. Van acá adentro y
 * no como archivos en `assets` por lo mismo que los iconos ---no cuestan un
 * pedido más, y sobre todo se pueden pintar.
 *
 * Todos los trazos van en `currentColor`. La identidad tiene el logo en veinte
 * colores y no hace falta importar ninguno: la navbar ya sabe de qué color va
 * su contenido en cada estado ---blanco sobre el hero, blanco sobre la barra de
 * tinta, tinta sobre el papel--- y el logo lo hereda. Un solo dibujo para los
 * veinte.
 */

/* El trazo es el mismo en todo el sistema: punta recta, unión redondeada y
   grosor constante, que es lo que hace que las letras se lean construidas y no
   escritas. Va acá para no repetirlo en cada path. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 16,
  strokeLinecap: 'butt',
  strokeLinejoin: 'round',
} as const

/**
 * `auteando`, el logotipo completo.
 *
 * El `viewBox` está ajustado al dibujo ---incluido el medio trazo que sobresale
 * de cada extremo--- y no tiene margen propio. El aire alrededor lo pone quien
 * lo usa, con CSS, que es donde se puede ajustar sin volver a exportar nada.
 *
 * La `n` baja ocho unidades más que el resto de las letras. No es un error de
 * medición: es del dibujo, y por eso el alto llega a 117 y no a 109.
 */
export function Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-8 -8 722 117" role="img" aria-label="auteando" {...props}>
      {/* a */}
      <path d="M67 28H29Q8 28 8 49V72Q8 93 29 93H46Q67 93 67 72V28Z" {...stroke} />
      <path d="M67 29V80Q67 93 80 93H86" {...stroke} />
      {/* u */}
      <path d="M106 20V72Q106 93 127 93H147Q168 93 168 72V20" {...stroke} />
      {/* t */}
      <path d="M213 0V74Q213 93 232 93H256" {...stroke} />
      <path d="M188 29H255" {...stroke} />
      {/* e */}
      <path d="M340 93H297Q276 93 276 72V49Q276 28 297 28H317Q338 28 338 49V59H276" {...stroke} />
      {/* a */}
      <path d="M425 28H387Q366 28 366 49V72Q366 93 387 93H404Q425 93 425 72V28Z" {...stroke} />
      <path d="M425 29V80Q425 93 438 93H444" {...stroke} />
      {/* n */}
      <path d="M464 101V49Q464 28 485 28H505Q526 28 526 49V101" {...stroke} />
      {/* d */}
      <path d="M616 28H575Q554 28 554 49V72Q554 93 575 93H595Q616 93 616 72V0" {...stroke} />
      {/* o */}
      <path d="M665 28H685Q706 28 706 49V72Q706 93 685 93H665Q644 93 644 72V49Q644 28 665 28Z" {...stroke} />
    </svg>
  )
}

/**
 * El símbolo: la `a` inicial del mismo logotipo, sin la caja.
 *
 * La caja ---el cuadrado de esquinas redondeadas--- la pone quien lo usa, que
 * es lo que deja elegir si va en tinta con la letra amarilla o al revés. Igual
 * que el logotipo, el `viewBox` está ajustado al trazo.
 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 20 94 81" role="img" aria-label="auteando" {...props}>
      <path d="M67 28H29Q8 28 8 49V72Q8 93 29 93H46Q67 93 67 72V28Z" {...stroke} />
      <path d="M67 29V80Q67 93 80 93H86" {...stroke} />
    </svg>
  )
}
