/**
 * Lo que comparten los dibujos del garage y los de niveles.
 *
 * Hubo un filtro SVG que le daba temblor al trazo, para que la línea se leyera
 * dibujada a mano. Se sacó: con el trazo fino y las puntas cuadradas el dibujo
 * ya no se lee como diagrama, y el temblor encima lo ensuciaba.
 */

/** Atributos comunes a todas las escenas. El contrato completo está arriba de
 *  `components/garage/scenes.tsx`. */
export const sceneSvgProps = {
  viewBox: '0 0 320 200',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
}
