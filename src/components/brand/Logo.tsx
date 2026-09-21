import { useId, type SVGProps } from 'react'
import { BRAND } from '../../config/brand'

/**
 * El logotipo, el símbolo y los dos juntos.
 *
 * Es la versión geométrica en minúsculas, en bold: cada letra es un trazo de
 * 20 unidades, no un contorno relleno, con las curvas de radio 21 y la `o`
 * estirada en un remate horizontal que cierra la palabra. Viene del kit
 * `auteando-minuscula-bold/02-bold` (el texto) y `auteando-bold-alineado` (los
 * dos juntos).
 *
 * El texto va en `currentColor`. El kit trae veintiún colores y no hace falta
 * importar ninguno: la navbar ya decide de qué color va su contenido en cada
 * estado ---blanco sobre el hero, tinta sobre el papel--- y el logo lo hereda.
 *
 * El símbolo no. Es un cuadrado amarillo con la `a` en tinta, y es igual sobre
 * fondo claro y sobre fondo oscuro: es la parte de la marca que no cambia. Por
 * eso sus dos colores van escritos acá y no heredados.
 *
 * Los `viewBox` están ajustados al dibujo, medidos renderizando el kit y no
 * calculados a mano: el kit exporta con aire alrededor, y ese aire acá lo pone
 * el CSS de cada uso. Los `d` y los `transform` salen tal cual del kit; si el
 * logo cambia, se reemplazan por los del archivo nuevo.
 */

const AMARILLO = '#FFD100'
const TINTA = '#0A100C'

/* Las ocho letras, cada una con su corrimiento en x. La `a` y la segunda `a`
   son el mismo dibujo, y es también la letra del símbolo. */
const A = ['M67 28H29Q8 28 8 49V72Q8 93 29 93H46Q67 93 67 72V28Z', 'M67 29V80Q67 93 80 93H86']

const LETRAS: [number, string[]][] = [
  [0, A],
  [98, ['M8 20V72Q8 93 29 93H49Q70 93 70 72V20']],
  [188, ['M25 0V74Q25 93 44 93H68', 'M0 29H67']],
  [268, ['M72 93H29Q8 93 8 72V49Q8 28 29 28H49Q70 28 70 49V59H8']],
  [358, A],
  [456, ['M8 101V49Q8 28 29 28H49Q70 28 70 49V101']],
  [546, ['M70 28H29Q8 28 8 49V72Q8 93 29 93H49Q70 93 70 72V0']],
  [636, ['M29 28H49Q70 28 70 49V72Q70 93 49 93H29Q8 93 8 72V49Q8 28 29 28Z', 'M49 93H108']],
]

function Letras() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={20}
      strokeLinecap="butt"
      strokeLinejoin="round"
    >
      {LETRAS.map(([x, trazos], index) => (
        <g key={index} transform={`translate(${x} 0)`}>
          {trazos.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ))}
    </g>
  )
}

/**
 * El cuadrado amarillo con la `a`, en las coordenadas del kit (el cuadrado va
 * de 16 a 224).
 *
 * El remate de la `a` se sale por el borde derecho y el cuadrado lo corta: por
 * eso el recorte. El `id` sale de `useId` porque el símbolo aparece más de una
 * vez en la misma página ---la navbar y el pie--- y dos `clipPath` con el mismo
 * id hacen que el segundo recorte con el del primero.
 */
function Simbolo() {
  const recorte = useId()
  return (
    <>
      <rect x="16" y="16" width="208" height="208" rx="45" fill={AMARILLO} />
      <defs>
        <clipPath id={recorte}>
          <rect x="16" y="16" width="208" height="208" rx="45" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${recorte})`}>
        <g transform="translate(58 -9) scale(2.14)" fill="none" stroke={TINTA} strokeWidth={20}>
          <path d={A[0]} strokeLinejoin="round" />
          <path d={A[1]} />
        </g>
      </g>
    </>
  )
}

/** `auteando`, el logotipo solo. Proporción 7,24 a 1. */
export function Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-2 0 746 103" role="img" aria-label={BRAND} {...props}>
      <Letras />
    </svg>
  )
}

/** El símbolo solo: cuadrado, para el favicon y donde la marca va sola. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="16 16 208 208" role="img" aria-label={BRAND} {...props}>
      <Simbolo />
    </svg>
  )
}

/**
 * El símbolo y el logotipo juntos, alineados.
 *
 * No es poner uno al lado del otro con CSS. El kit ajusta el tamaño del símbolo
 * para que su borde de arriba y el de abajo coincidan con los del texto ---el
 * alto de la `t` y la `d` arriba, el pie de las letras abajo--- y deja entre los
 * dos un espacio de dos tercios del símbolo. Es un dibujo solo, con las
 * coordenadas del kit tal cual: así la alineación no depende de que dos alturas
 * de CSS redondeen igual. Proporción 8,9 a 1.
 */
export function BrandLockup(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="41.88 87.75 1487.75 167.25" role="img" aria-label={BRAND} {...props}>
      <g transform="translate(29.019777265745006 74.93049155145928) scale(0.8034514208909371)">
        <Simbolo />
      </g>
      <g transform="translate(276 46) scale(0.9285714285714286)">
        <g transform="translate(50 45) scale(1.7473118279569892)">
          <Letras />
        </g>
      </g>
    </svg>
  )
}
