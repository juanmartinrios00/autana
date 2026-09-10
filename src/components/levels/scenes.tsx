/**
 * Un dibujo por nivel.
 *
 * Mismo contrato que las escenas del garage —está escrito arriba de
 * `components/garage/scenes.tsx`— y mismo filtro de trazo. Estos cuatro
 * también son un piso: se reemplazan sin tocar la pantalla.
 *
 * La progresión no es de premios, es de la relación con el auto. Se arranca
 * con una llave suelta y se termina con un tipo al que le preguntan. Un trofeo
 * habría sido lo obvio, y habría dicho exactamente lo que no queremos que
 * diga: que el nivel es un ranking de vendedores.
 */

import { sceneSvgProps } from '../ui/sketch'

interface SceneProps {
  className?: string
}

/** Nivel 1 — Recién llegado: la llave, y nada más todavía. */
function ArrivedScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M118 118a26 26 0 1 0 0-52 26 26 0 0 0 0 52z" />
      <path d="M118 92h84" />
      <path d="M176 92v22" />
      <path d="M202 92v16" />
      <circle cx="118" cy="92" r="9" fill="var(--accent)" stroke="none" />
      <path d="M60 158h200" />
    </svg>
  )
}

/** Nivel 2 — Vendedor: el auto con el cartel en la ventanilla. */
function SellerScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M40 158h240" />
      <path d="M78 158v-24q0-8 9-10l24-4 20-24q4-5 11-5h38q7 0 11 6l14 23 26 5q9 2 9 11v22" />
      <path d="M111 120h96" />
      <path d="M142 120V92" />
      <circle cx="110" cy="158" r="15" />
      <circle cx="204" cy="158" r="15" />
      {/* el cartel */}
      <path d="M196 60h56v34h-56z" stroke="var(--accent)" />
      <path d="M224 94v18" />
    </svg>
  )
}

/** Nivel 3 — Fierrero: el capot abierto, que es donde se separa el que sabe. */
function GearheadScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M40 158h240" />
      <path d="M92 158v-22q0-8 9-10l22-4 18-22q4-5 11-5h34q7 0 11 6l13 21 24 4q9 2 9 11v21" />
      <path d="M123 122h84" />
      {/* el capot levantado */}
      <path d="M92 126L46 84" stroke="var(--accent)" />
      <path d="M46 84l30-8" stroke="var(--accent)" />
      <circle cx="120" cy="158" r="14" />
      <circle cx="212" cy="158" r="14" />
      {/* la llave inglesa */}
      <path d="M246 118l24-24" />
      <path d="M264 88l12 12-8 8-12-12z" />
    </svg>
  )
}

/** Nivel 4 — Referente: dos que preguntan, uno que contesta. */
function ReferenceScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M40 158h240" />
      {/* el auto, de fondo */}
      <path d="M150 132v-18q0-7 8-9l20-3 16-19q4-4 10-4h30q6 0 10 5l11 18 21 4q8 2 8 9v17" />
      <circle cx="176" cy="132" r="12" />
      <circle cx="252" cy="132" r="12" />
      {/* el que contesta */}
      <circle cx="80" cy="82" r="15" />
      <path d="M58 158v-30q0-22 22-22t22 22v30" />
      {/* las dos preguntas */}
      <path d="M104 56h30v22h-12l-8 9v-9h-10z" stroke="var(--accent)" />
      <path d="M142 30h28v20h-11l-7 8v-8h-10z" stroke="var(--accent)" />
    </svg>
  )
}

const SCENES = [ArrivedScene, SellerScene, GearheadScene, ReferenceScene]

/** `level` es 1 a 4, como lo devuelve `computeLevel`. */
export function LevelScene({ level, className }: { level: number } & SceneProps) {
  const Scene = SCENES[Math.min(Math.max(level, 1), SCENES.length) - 1]!
  return <Scene className={className} />
}
