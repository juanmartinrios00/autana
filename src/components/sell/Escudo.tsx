import { Icon } from '../ui/Icon'
import './Escudo.css'

interface EscudoProps {
  number: number
  state: 'done' | 'on' | 'next'
}

/**
 * El número de un paso de publicar, dibujado como el escudo de una ruta
 * nacional.
 *
 * Publicar son cuatro tramos de un mismo camino, y el escudo es lo que en la
 * ruta dice en cuál estás. La banda de arriba es la de "RUTA NACIONAL", sin el
 * texto: a este tamaño no se leería, y la forma sola ya se reconoce.
 *
 * El amarillo marca el paso en el que se está, como marca la acción en el
 * resto del sitio; los hechos van en tinta con la tilde, y los que faltan,
 * vacíos.
 */
export function Escudo({ number, state }: EscudoProps) {
  return (
    <span className={`escudo escudo--${state}`}>
      <svg viewBox="0 0 32 36" aria-hidden="true" focusable="false" className="escudo__forma">
        <path
          d="M2.5 2.5h27v13c0 9.2-6 15.6-13.5 18-7.5-2.4-13.5-8.8-13.5-18z"
          strokeWidth={1.6}
          strokeLinejoin="miter"
        />
        <path d="M2.5 9h27" strokeWidth={1.2} className="escudo__banda" />
      </svg>
      <span className="escudo__numero">
        {state === 'done' ? <Icon name="check" size={13} /> : <span className="mono">{number}</span>}
      </span>
    </span>
  )
}
