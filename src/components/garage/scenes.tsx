/**
 * Las escenas del garage.
 *
 * ---------------------------------------------------------------------------
 * CONTRATO — leer antes de reemplazar estos dibujos
 * ---------------------------------------------------------------------------
 *
 * Estos cuatro dibujos son un piso, no el destino. Están hechos para que un
 * ilustrador (o Codex) los reemplace sin tocar una línea de la pantalla. Lo
 * que hay que respetar para que el reemplazo entre solo:
 *
 * 1. `viewBox="0 0 320 200"`. La pantalla reserva esa proporción; si cambia,
 *    la grilla se descuadra.
 *
 * 2. El trazo va en `currentColor` y el relleno en `none`. NO poner colores
 *    fijos. La escena hereda el color del contenedor, que es lo que hace que
 *    funcione igual en tema claro y oscuro sin dibujar dos versiones.
 *
 * 3. Un solo elemento puede llevar acento, con `stroke="var(--accent)"` o
 *    `fill="var(--accent)"`. Uno. El amarillo en este sistema es para la
 *    acción; si toda la escena es amarilla deja de señalar nada.
 *
 * 4. Nada de `<image>`, ni PNG, ni JPG. Son SVG inline a propósito: pesan
 *    poco, escalan, y siguen al tema. Un hero de 2,3 MB ya nos pasó una vez.
 *
 * 5. Sin `id` duplicados entre escenas: las cuatro conviven en el mismo
 *    documento. El filtro que le da el temblor al trazo es compartido y vive
 *    en `components/ui/SketchDefs`; la pantalla lo declara una vez.
 */

import { sceneSvgProps } from '../ui/sketch'
import type { GarageSlot } from '../../types'

interface SceneProps {
  className?: string
}

/* Los atributos comunes viven en `ui/SketchDefs`, porque los comparte con los
   dibujos de la pantalla de niveles. El `aria-hidden` que traen es deliberado:
   la escena ilustra un texto que ya está al lado, así que anunciarla de nuevo
   es ruido para quien usa lector de pantalla. */
const svgProps = sceneSvgProps

/** El auto de tres puertas con el que casi todos aprendieron. */
function FirstScene({ className }: SceneProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M30 158h260" />
      {/* farol de la cuadra */}
      <path d="M268 158V70" />
      <path d="M258 70h20" />
      <path d="M96 158v-22q0-8 9-10l22-4 20-24q4-5 11-5h36q7 0 11 6l14 23 26 5q9 2 9 11v20" />
      <path d="M127 122h96" />
      <path d="M158 122V93" />
      <circle cx="126" cy="158" r="15" />
      <circle cx="212" cy="158" r="15" />
      <circle cx="126" cy="158" r="5" />
      <circle cx="212" cy="158" r="5" />
      <circle cx="268" cy="62" r="9" fill="var(--accent)" stroke="none" />
    </svg>
  )
}

/** El de hoy, en la puerta de casa. */
function CurrentScene({ className }: SceneProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M30 158h260" />
      {/* la casa */}
      <path d="M40 158V96l38-26 38 26v62" />
      <path d="M64 158v-34h28v34" />
      <path d="M150 158v-24q0-8 9-10l24-4 19-23q4-5 11-5h32q7 0 11 6l13 22 24 4q9 2 9 11v23" />
      <path d="M181 120h84" />
      <path d="M210 120V92" />
      <circle cx="176" cy="158" r="14" />
      <circle cx="252" cy="158" r="14" />
      <path d="M64 138h28" stroke="var(--accent)" />
    </svg>
  )
}

/** El que algún día: ruta abierta, algo bajo y largo. */
function DreamScene({ className }: SceneProps) {
  return (
    <svg {...svgProps} className={className}>
      {/* las sierras */}
      <path d="M30 108l42-40 30 28 26-24 34 36" />
      <path d="M186 108l30-26 26 24 24-20 24 22" />
      <path d="M30 158h260" />
      {/* la linea del medio, que es lo unico que se mueve */}
      <path d="M44 176h30M96 176h30M148 176h30M200 176h30M252 176h24" stroke="var(--accent)" />
      <path d="M104 152v-14q0-7 9-9l30-5 26-16q5-3 11-3h26q8 0 12 6l10 15 22 4q9 2 9 10v12" />
      <path d="M143 124h74" />
      <circle cx="136" cy="152" r="13" />
      <circle cx="222" cy="152" r="13" />
    </svg>
  )
}

/** El que no tendrías que haber vendido: el lugar donde estaba. */
function MissedScene({ className }: SceneProps) {
  return (
    <svg {...svgProps} className={className}>
      {/* el box, con la puerta levantada */}
      <path d="M56 158V72h208v86" />
      <path d="M56 72h208" />
      <path d="M74 72v-8h172v8" />
      <path d="M30 158h260" />
      {/* la mancha de aceite, que es todo lo que quedo */}
      <path d="M138 140q-14 0-14 7t18 7q22 0 30-5t-6-8q-12-1-28-1z" stroke="var(--accent)" />
      {/* la herramienta colgada */}
      <path d="M232 96v26" />
      <path d="M226 96h12" />
      <path d="M96 96h30" />
      <path d="M96 110h18" />
    </svg>
  )
}

const SCENES: Record<GarageSlot, (props: SceneProps) => React.JSX.Element> = {
  first: FirstScene,
  current: CurrentScene,
  dream: DreamScene,
  missed: MissedScene,
}

export function GarageScene({ slot, className }: { slot: GarageSlot } & SceneProps) {
  const Scene = SCENES[slot]
  return <Scene className={className} />
}
