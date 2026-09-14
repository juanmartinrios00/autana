/**
 * Las escenas del garage.
 *
 * ---------------------------------------------------------------------------
 * CONTRATO — leer antes de reemplazar estos dibujos
 * ---------------------------------------------------------------------------
 *
 * Una escena son dos capas: el fondo de la consigna y el auto.
 *
 * El fondo dice qué espacio es —el farol de la cuadra del primero, la casa del
 * de hoy, la ruta del soñado, el box vacío del que se extraña— y es fijo por
 * consigna. El auto sale de lo que cada uno cargó: la silueta de su carrocería
 * (`silhouettes.ts`) y, si es de antes de 1990, cromados. Así dos garages con
 * las mismas cuatro consignas no se ven iguales, que era lo que pasaba cuando
 * el dibujo entero dependía sólo de la consigna.
 *
 * Estos dibujos son un piso, no el destino. Están hechos para que un
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
 *    acción; si toda la escena es amarilla deja de señalar nada. Lo lleva el
 *    fondo, nunca la silueta.
 *
 * 4. Nada de `<image>`, ni PNG, ni JPG. Son SVG inline a propósito: pesan
 *    poco, escalan, y siguen al tema. Un hero de 2,3 MB ya nos pasó una vez.
 *
 * 5. Sin `id` duplicados entre escenas: las cuatro conviven en el mismo
 *    documento, así que un `id` repetido lo gana la primera.
 *
 * 6. Cada fondo deja libre el lugar donde va el auto (`PLACEMENT`). Un fondo
 *    nuevo que dibuje algo ahí se pisa con la silueta.
 */

import { bodyFor } from '../../data/models'
import { sceneSvgProps } from '../ui/sketch'
import { CLASSIC_BEFORE, SILHOUETTES } from './silhouettes'
import type { BodyType, GarageEntry, GarageSlot } from '../../types'

interface SceneProps {
  className?: string
}

/* Los atributos comunes viven en `ui/sketch`, porque los comparte con los
   dibujos de la pantalla de niveles. El `aria-hidden` que traen es deliberado:
   la escena ilustra un texto que ya está al lado, así que anunciarla de nuevo
   es ruido para quien usa lector de pantalla. */
const svgProps = sceneSvgProps

/* ---------------------------------------------------------------------------
   Fondos
--------------------------------------------------------------------------- */

/** La cuadra donde se aprendió: el farol es lo único encendido. */
function FirstBackdrop() {
  return (
    <>
      <path d="M30 158h260" />
      <path d="M268 158V70" />
      <path d="M258 70h20" />
      <circle cx="268" cy="62" r="9" fill="var(--accent)" stroke="none" />
    </>
  )
}

/** La puerta de casa. */
function CurrentBackdrop() {
  return (
    <>
      <path d="M30 158h260" />
      <path d="M40 158V96l38-26 38 26v62" />
      <path d="M64 158v-34h28v34" />
      <path d="M64 138h28" stroke="var(--accent)" />
    </>
  )
}

/**
 * Ruta abierta, con las sierras atrás.
 *
 * Las sierras van altas a propósito. El dibujo es de línea sin relleno, así
 * que un auto no tapa lo que tiene detrás: donde se cruzan, la montaña pasa
 * por adentro de la carrocería. Arriba de la camioneta más alta no se cruzan.
 */
function DreamBackdrop() {
  return (
    <>
      <path d="M30 76l42-40 30 28 26-24 34 36" />
      <path d="M186 76l30-26 26 24 24-20 24 22" />
      <path d="M30 158h260" />
      {/* la linea del medio, que es lo unico que se mueve */}
      <path d="M44 176h30M96 176h30M148 176h30M200 176h30M252 176h24" stroke="var(--accent)" />
    </>
  )
}

/** El box con la puerta levantada, donde ya no está. */
function MissedBackdrop() {
  return (
    <>
      <path d="M56 158V72h208v86" />
      <path d="M56 72h208" />
      <path d="M74 72v-8h172v8" />
      <path d="M30 158h260" />
      {/* la mancha de aceite, que es todo lo que quedo. Chata y pegada al
          piso: es lo que estaba debajo del auto, y alta se leia como algo
          flotando adentro del contorno */}
      <path d="M126 154q0-4 14-4h26q10 0 10 3t-12 4h-26q-12 0-12-3z" stroke="var(--accent)" />
      {/* la herramienta colgada, y el estante alto para que no lo pise el
          contorno de un auto alto */}
      <path d="M232 96v26" />
      <path d="M226 96h12" />
      <path d="M96 80h30" />
      <path d="M96 88h18" />
    </>
  )
}

const BACKDROPS: Record<GarageSlot, () => React.JSX.Element> = {
  first: FirstBackdrop,
  current: CurrentBackdrop,
  dream: DreamBackdrop,
  missed: MissedBackdrop,
}

/* ---------------------------------------------------------------------------
   Dónde va el auto en cada fondo
--------------------------------------------------------------------------- */

interface Placement {
  x: number
  y: number
  scale: number
  /** El auto que ya no está: contorno punteado. */
  ghost?: boolean
}

const PLACEMENT: Record<GarageSlot, Placement> = {
  /* Entre el borde y el farol. */
  first: { x: 172, y: 158, scale: 1 },
  /* A la derecha de la casa, un poco más chico para que la casa no quede enana. */
  current: { x: 212, y: 158, scale: 0.9 },
  dream: { x: 175, y: 158, scale: 0.9 },
  /* Adentro del box, corrido a la izquierda para que la rueda no tape la mancha. */
  missed: { x: 152, y: 158, scale: 0.78, ghost: true },
}

/**
 * Qué silueta va cuando no se reconoce el auto, o cuando el espacio está vacío.
 *
 * Son las formas que tenían los dibujos originales de cada consigna: el tres
 * puertas con el que casi todos aprendieron, un sedán en la puerta de casa, algo
 * bajo y largo para la ruta.
 */
const DEFAULT_BODY: Record<GarageSlot, BodyType> = {
  first: 'hatchback',
  current: 'sedan',
  dream: 'coupe',
  missed: 'sedan',
}

/* ---------------------------------------------------------------------------
   El auto
--------------------------------------------------------------------------- */

/* La silueta se escala por consigna, pero el trazo tiene que quedar del mismo
   grosor que el fondo: sin esto, un auto al 78% se dibuja con línea más fina y
   parece de otro dibujante. */
const keepStroke = { vectorEffect: 'non-scaling-stroke' } as const

function Car({ body, classic, placement }: {
  body: BodyType
  classic: boolean
  placement: Placement
}) {
  const shape = SILHOUETTES[body]
  const dash = placement.ghost ? '5 5' : undefined
  const [rear, front] = shape.wheels
  const { bumpers } = shape

  return (
    <g
      transform={`translate(${placement.x} ${placement.y}) scale(${placement.scale})`}
      strokeDasharray={dash}
    >
      <path d={shape.body} {...keepStroke} />
      {shape.details.map((d) => (
        <path key={d} d={d} {...keepStroke} />
      ))}
      <circle cx={rear} cy={0} r={shape.wheelRadius} {...keepStroke} />
      <circle cx={front} cy={0} r={shape.wheelRadius} {...keepStroke} />

      {classic && (
        <>
          {/* Los cromados sobresalen del contorno, que es como se veían. */}
          <path
            d={`M${bumpers.rear - 4} ${bumpers.y}H${bumpers.rear + 12}M${bumpers.front - 12} ${bumpers.y}H${bumpers.front + 4}`}
            {...keepStroke}
          />
          <circle cx={rear} cy={0} r={5} {...keepStroke} />
          <circle cx={front} cy={0} r={5} {...keepStroke} />
        </>
      )}
    </g>
  )
}

/* ---------------------------------------------------------------------------
   La escena
--------------------------------------------------------------------------- */

type SceneCar = Pick<GarageEntry, 'make' | 'model' | 'year'>

/**
 * El fondo de la consigna con el auto de quien lo cargó.
 *
 * Sin `car` es el espacio vacío: la invitación. Ahí va la silueta de la
 * consigna, salvo en el que se extraña, que vacío muestra sólo la mancha —
 * todavía no hay un auto que extrañar.
 */
export function GarageScene({
  slot,
  car,
  className,
}: { slot: GarageSlot; car?: SceneCar } & SceneProps) {
  const Backdrop = BACKDROPS[slot]
  const placement = PLACEMENT[slot]
  const showCar = car !== undefined || slot !== 'missed'

  const body = (car && bodyFor(car.make, car.model)) ?? DEFAULT_BODY[slot]
  const classic = Boolean(car?.year && car.year < CLASSIC_BEFORE)

  return (
    <svg {...svgProps} className={className}>
      <Backdrop />
      {showCar && <Car body={body} classic={classic} placement={placement} />}
    </svg>
  )
}
