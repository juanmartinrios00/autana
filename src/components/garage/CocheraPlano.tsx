import './CocheraPlano.css'

/** Un auto visto desde arriba, con el centro en `cx`. */
function AutoDeArriba({ cx, className }: { cx: number; className?: string }) {
  return (
    <g className={className}>
      <rect x={cx - 30} y={64} width={60} height={124} rx={9} />
      {/* parabrisas, techo y luneta */}
      <path d={`M${cx - 24} 100q24-9 48 0l-4 17h-40z`} />
      <path d={`M${cx - 20} 117h40v36h-40z`} />
      <path d={`M${cx - 21} 166h42l-3 11h-36z`} />
      {/* espejos */}
      <path d={`M${cx - 30} 104h-5`} />
      <path d={`M${cx + 30} 104h5`} />
    </g>
  )
}

/**
 * El encabezado del garage: el plano de una cochera visto desde arriba, con
 * los cuatro lugares pintados en el piso.
 *
 * Uno por consigna y en el mismo orden que en la pantalla ---01 el primero, 02
 * el de hoy, 03 el soñado, 04 el que se extraña---. El 04 está vacío, con el
 * contorno punteado de un auto que ya no está. El amarillo lo lleva el soñado:
 * un solo acento, como en las escenas (ver el contrato en `scenes.tsx`).
 *
 * Mismo registro que el resto de los dibujos: trazo en `currentColor`, sin
 * relleno, puntas rectas. Hereda el color de la cabecera oscura.
 */
export function CocheraPlano({ className }: { className?: string }) {
  const lugares = [70, 170, 270, 370]

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
      {/* la pared del fondo y las columnas */}
      <path d="M12 28h416" strokeWidth={3} />
      <path d="M12 28v20" strokeWidth={3} />
      <path d="M428 28v20" strokeWidth={3} />

      {/* las rayas pintadas de cada lugar */}
      {[20, 120, 220, 320, 420].map((x) => (
        <path key={x} d={`M${x} 40v166`} />
      ))}

      {/* los topes de rueda */}
      {lugares.map((cx) => (
        <path key={cx} d={`M${cx - 18} 52h36`} strokeWidth={3} />
      ))}

      <AutoDeArriba cx={70} />
      <AutoDeArriba cx={170} />
      <AutoDeArriba cx={270} className="cochera__sonado" />
      <AutoDeArriba cx={370} className="cochera__ausente" />

      {/* los números pintados en el piso */}
      {lugares.map((cx, index) => (
        <text key={cx} x={cx} y={228} textAnchor="middle" className="cochera__numero">
          {String(index + 1).padStart(2, '0')}
        </text>
      ))}

      {/* la calle de circulación, con su flecha */}
      <path d="M20 256h400" strokeDasharray="14 12" strokeWidth={1.2} />
      <path d="M380 274h36" />
      <path d="m406 266 10 8-10 8" />
    </svg>
  )
}
