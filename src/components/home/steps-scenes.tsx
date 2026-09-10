/**
 * Un dibujo por paso, para comprar y para vender.
 *
 * Mismo contrato que las escenas del garage y las de niveles —está escrito
 * arriba de `components/garage/scenes.tsx`—: viewBox 320×200, trazo en
 * `currentColor`, el amarillo reservado para lo único que importa de cada
 * dibujo, y el filtro de temblor que declara `SketchDefs`.
 *
 * Son un piso, no una obra terminada: cada uno se reemplaza sin tocar la
 * pantalla que los usa.
 */

import { sceneSvgProps } from '../ui/sketch'

interface SceneProps {
  className?: string
}

/* --- Vender ------------------------------------------------------------- */

/** Cargar el auto: el teléfono, que es con lo que se hace. */
export function UploadScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="106" y="34" width="108" height="146" rx="12" />
      <path d="M140 34h40" />
      {/* el auto dentro de la pantalla */}
      <path d="M126 122v-14q0-5 6-6l14-3 11-14q3-3 7-3h20q4 0 6 4l8 13 14 3q6 1 6 7v13" />
      <path d="M146 104h48" />
      <circle cx="142" cy="122" r="8" />
      <circle cx="180" cy="122" r="8" />
      {/* el más, que es la acción */}
      <circle cx="196" cy="152" r="16" stroke="var(--accent)" />
      <path d="M196 144v16M188 152h16" stroke="var(--accent)" />
    </svg>
  )
}

/**
 * Publicar gratis: la etiqueta de precio, y en ella un cero por ciento.
 *
 * El cero y el porcentaje se dibujan, no se escriben: un `<text>` acá saldría
 * con la tipografía de la interfaz y rompería el trazo a mano del resto. Un
 * porcentaje es, literalmente, dos circulitos y una diagonal.
 */
export function FreeScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      {/* la etiqueta, colgada de su cordón */}
      <path d="M150 42h92q10 0 10 10v92q0 10-10 10h-92l-58-56z" />
      <circle cx="122" cy="98" r="10" />
      <path d="M92 98L44 62" />
      {/* el cero */}
      <ellipse cx="176" cy="98" rx="17" ry="24" stroke="var(--accent)" />
      {/* el por ciento */}
      <circle cx="212" cy="84" r="7" stroke="var(--accent)" />
      <path d="M232 78l-24 40" stroke="var(--accent)" />
      <circle cx="228" cy="112" r="7" stroke="var(--accent)" />
      <path d="M60 172h200" />
    </svg>
  )
}

/**
 * Recibir consultas: tres mensajes apilados, y el de arriba recién llegado.
 *
 * Es una bandeja, no una conversación —de eso se ocupa `ContactScene`—, así que
 * van uno debajo del otro y sin colita: lo que cuenta es que se acumulan.
 */
export function InboxScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="46" y="112" width="196" height="46" rx="10" />
      <path d="M68 135h96" />

      <rect x="46" y="56" width="220" height="46" rx="10" />
      <path d="M68 79h120" />

      {/* el último, el que llegó recién */}
      <rect x="46" y="20" width="168" height="26" rx="10" stroke="var(--accent)" />
      <path d="M68 33h72" stroke="var(--accent)" />

      <path d="M46 180h180" />
    </svg>
  )
}

/* --- Comprar ------------------------------------------------------------ */

/** Filtrar: las perillas, que es lo que se mueve hasta que aparece. */
export function FilterScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M50 62h220M50 100h220M50 138h220" />
      <circle cx="112" cy="62" r="13" fill="var(--canvas)" />
      <circle cx="206" cy="100" r="13" fill="var(--canvas)" />
      <circle cx="142" cy="138" r="13" stroke="var(--accent)" fill="var(--canvas)" />
      <path d="M50 176h120" />
    </svg>
  )
}

/** La ficha: la foto grande arriba y los datos abajo. */
export function DetailScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="48" y="34" width="224" height="140" rx="10" />
      <path d="M48 118h224" />
      {/* el auto en la foto */}
      <path d="M86 100v-16q0-6 7-7l17-3 13-16q3-4 8-4h24q5 0 7 5l10 15 16 3q7 1 7 8v15" />
      <path d="M110 78h56" />
      <circle cx="104" cy="100" r="9" />
      <circle cx="168" cy="100" r="9" />
      <path d="M72 138h84" stroke="var(--accent)" />
      <path d="M72 156h140" />
    </svg>
  )
}

/**
 * Escribirle al vendedor: los dos globos, sin nadie en el medio.
 *
 * El segundo es el mismo dibujo espejado con un `transform`, y no un segundo
 * path escrito a mano. Un globo con colita es un trazo cerrado largo: copiarlo
 * al revés a ojo es cómo el anterior terminó abierto por un lado.
 */
export function ContactScene({ className }: SceneProps) {
  const bubble = 'M46 40h118q12 0 12 12v50q0 12-12 12h-58l-30 26v-26H46q-12 0-12-12V52q0-12 12-12z'

  return (
    <svg {...sceneSvgProps} className={className}>
      <path d={bubble} />
      <path d="M68 66h74" />
      <path d="M68 88h48" />

      <g transform="translate(314, 52) scale(-1, 1)" stroke="var(--accent)">
        <path d={bubble} />
        <path d="M68 66h74" />
        <path d="M68 88h48" />
      </g>
    </svg>
  )
}
