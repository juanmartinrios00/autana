import { SLOTS } from '../../lib/garage'
import { GarageScene } from './scenes'
import type { GarageEntry, GarageSlot } from '../../types'
import './GarageShowcase.css'

/**
 * Las cuatro consignas del garage, dibujadas, para explicar qué es.
 *
 * La usan la portada y la página `/garage`: son las dos puertas de entrada
 * para alguien que todavía no tiene cuenta, y tienen que contar lo mismo.
 *
 * Los dibujos van con autos de ejemplo y no con los genéricos a propósito. Lo
 * que hace distinto al garage es que el dibujo sale del auto que cada uno
 * carga: un 12 del 78 se dibuja con cromados y una Hilux con caja. Con las
 * siluetas por defecto eso no se ve, y es justo lo que tiene que verse antes
 * de que alguien decida armar el suyo.
 */

const EXAMPLES: Record<GarageSlot, Pick<GarageEntry, 'make' | 'model' | 'year'>> = {
  first: { make: 'Renault', model: '12', year: 1978 },
  current: { make: 'Toyota', model: 'Hilux', year: 2019 },
  dream: { make: 'Ford', model: 'Mustang', year: 2022 },
  missed: { make: 'Peugeot', model: '504', year: 1986 },
}

interface GarageShowcaseProps {
  /** `dark` para ponerla sobre fondo `--ink`: los dibujos siguen al color del texto. */
  tone?: 'light' | 'dark'
}

export function GarageShowcase({ tone = 'light' }: GarageShowcaseProps) {
  return (
    <ul className={`gshow gshow--${tone}`}>
      {SLOTS.map((slot) => {
        const example = EXAMPLES[slot.id]
        return (
          <li key={slot.id} className="gshow__item">
            <div className="gshow__art">
              <GarageScene slot={slot.id} car={example} className="gshow__scene" />
            </div>
            <h3 className="gshow__title">{slot.title}</h3>
            <p className="gshow__hint">{slot.hint}</p>
            <p className="gshow__example mono">
              Ej. {example.make} {example.model} · {example.year}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
