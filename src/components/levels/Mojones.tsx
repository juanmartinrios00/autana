import { LEVELS } from '../../lib/levels'

import './Mojones.css'

/**
 * El encabezado de niveles: mojones al costado de una ruta.
 *
 * Cada nivel es un mojón, y el kilómetro que dice es la cantidad de logros
 * que pide ---km 0, 2, 4, 6---, así que el dibujo cuenta lo mismo que la
 * escalera de abajo: se avanza haciendo cosas, no pasando el tiempo. Los
 * números salen de `LEVELS`: si cambia lo que pide un nivel, cambia el mojón.
 *
 * El último, el de "Referente", lleva el amarillo: un solo acento.
 */
export function Mojones({ className }: { className?: string }) {
  const xs = [40, 145, 250, 355]

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
      {/* la banquina y la ruta */}
      <path d="M0 214h440" />
      <path d="M0 250h440" strokeWidth={1.2} />
      <path d="M8 280h40M88 280h40M168 280h40M248 280h40M328 280h40M408 280h32" strokeWidth={2} />

      {LEVELS.map((level, index) => {
        const x = xs[index]!
        const last = index === LEVELS.length - 1
        /* Cada uno un poco más alto que el anterior: se va subiendo. */
        const top = 118 - index * 18
        return (
          <g key={level.title} className={last ? 'mojon mojon--meta' : 'mojon'}>
            {/* el poste, con la cabeza redondeada del mojón de ruta */}
            <path d={`M${x} 214V${top + 14}q0-14 22-14t22 14V214`} />
            {/* la franja de arriba */}
            <path d={`M${x} ${top + 30}h44`} />
            <text x={x + 22} y={top + 50} textAnchor="middle" className="mojon__km">
              KM
            </text>
            <text x={x + 22} y={top + 76} textAnchor="middle" className="mojon__numero">
              {level.at}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
