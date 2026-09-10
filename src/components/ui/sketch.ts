/**
 * Lo que comparten los dibujos del garage y los de niveles.
 *
 * Va en su propio archivo y no junto a `SketchDefs` porque un módulo que
 * exporta un componente y además constantes rompe el fast refresh: al editarlo
 * se recarga el estado de toda la pantalla en vez de sólo el componente.
 */

/** El filtro que le da el temblor al trazo. Lo declara `SketchDefs`. */
export const SKETCH_FILTER = 'url(#autana-sketch)'

/** Atributos comunes a todas las escenas. El contrato completo está arriba de
 *  `components/garage/scenes.tsx`. */
export const sceneSvgProps = {
  viewBox: '0 0 320 200',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  filter: SKETCH_FILTER,
  'aria-hidden': true,
  focusable: 'false' as const,
}
