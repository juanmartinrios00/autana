import type { CSSProperties } from 'react'
import { formatMileage } from '../../lib/format'
import './Odometro.css'

const DIGITOS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * El kilometraje como el cuentakilómetros del tablero: seis tambores con los
 * ceros de adelante, que al aparecer giran hasta su número.
 *
 * Es el dato que más se mira de un usado y el que más se desconfía, así que
 * se lo muestra con el objeto del que sale. Los ceros de adelante no son
 * adorno: "058.400" se lee de un golpe como "casi sesenta mil", igual que en
 * el tablero.
 *
 * El dibujo es para la vista; el lector de pantalla escucha "58.400 km".
 */
export function Odometro({ km }: { km: number }) {
  const texto = String(Math.max(0, Math.round(km))).padStart(6, '0')
  return (
    <span className="odo">
      <span className="sr-only">{formatMileage(km)}</span>
      <span className="odo__tambores" aria-hidden="true">
        {texto.split('').map((digito, index) => (
          <span className="odo__tambor" key={index}>
            <span
              className="odo__rollo"
              style={{ '--d': Number(digito), '--i': index } as CSSProperties}
            >
              {DIGITOS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
      <span className="odo__unidad" aria-hidden="true">
        km
      </span>
    </span>
  )
}
