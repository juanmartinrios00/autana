import { SILHOUETTES } from '../garage/silhouettes'
import type { BodyType } from '../../types'

/* Un auto de perfil, con las mismas siluetas que el garage. */
function Auto({ body, x, y, scale }: { body: BodyType; x: number; y: number; scale: number }) {
  const shape = SILHOUETTES[body]
  const keep = { vectorEffect: 'non-scaling-stroke' } as const
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={shape.body} {...keep} />
      {shape.details.map((d) => (
        <path key={d} d={d} {...keep} />
      ))}
      <circle cx={shape.wheels[0]} cy={0} r={shape.wheelRadius} {...keep} />
      <circle cx={shape.wheels[1]} cy={0} r={shape.wheelRadius} {...keep} />
    </g>
  )
}

/* Los banderines: triángulos colgando de una cuerda que cae un poco en el
   medio. Salen de la misma curva que la cuerda, así cuelgan de ella. */
const DESDE = { x: 30, y: 98 }
const HASTA = { x: 410, y: 98 }
const PANZA = { x: 220, y: 122 }

function puntoDeLaCuerda(t: number) {
  const u = 1 - t
  return {
    x: u * u * DESDE.x + 2 * u * t * PANZA.x + t * t * HASTA.x,
    y: u * u * DESDE.y + 2 * u * t * PANZA.y + t * t * HASTA.y,
  }
}

const BANDERINES = Array.from({ length: 13 }, (_, i) => puntoDeLaCuerda((i + 1) / 14))

/**
 * El encabezado de concesionarias: el frente de una agencia, con la vidriera,
 * el cartel y la tira de banderines colgada de punta a punta, que es lo que
 * hace que una agencia de acá se reconozca desde la vereda de enfrente.
 * Adelante, dos autos estacionados con las siluetas del garage.
 *
 * El amarillo lo llevan los banderines: un solo acento, como en todos los
 * dibujos (ver el contrato en `garage/scenes.tsx`).
 */
export function AgenciaDibujo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 440 300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {/* el cartel, sobre el techo */}
      <path d="M130 34h180v28H130z" />
      <path d="M170 62v8M270 62v8" />
      <text
        x={220}
        y={53}
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontFamily="var(--font-mono)"
        fontSize={13}
        fontWeight={700}
        letterSpacing="0.3em"
      >
        AUTOS
      </text>

      {/* el frente y la vidriera, con sus dos parantes */}
      <path d="M30 205V70h380v135" />
      <path d="M50 88h340v104H50z" />
      <path d="M163 88v104M277 88v104" />

      {/* la vereda y el cordón */}
      <path d="M0 205h440" />
      <path d="M0 228h440" />

      {/* la cuerda y los banderines */}
      <g stroke="var(--accent)">
        <path d={`M${DESDE.x} ${DESDE.y}Q${PANZA.x} ${PANZA.y} ${HASTA.x} ${HASTA.y}`} strokeWidth={1.2} />
        {BANDERINES.map(({ x, y }) => (
          <path key={x} d={`M${x - 7} ${y}h14l-7 14z`} />
        ))}
      </g>

      {/* dos autos estacionados en la calle */}
      <Auto body="sedan" x={125} y={286} scale={0.72} />
      <Auto body="pickup" x={318} y={286} scale={0.72} />
      <path d="M0 286h440" strokeWidth={1.2} />
    </svg>
  )
}
