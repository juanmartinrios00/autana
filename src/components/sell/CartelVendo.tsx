import { conPuntos } from '../../lib/format'
import type { Currency } from '../../types'
import './CartelVendo.css'

interface CartelVendoProps {
  make: string
  model: string
  trim: string
  year: string
  /** Sólo dígitos, como los guarda el borrador. */
  mileage: string
  price: string
  currency: Currency
  whatsapp: string
  city: string
}

/**
 * El resumen de lo que se está publicando, dibujado como el cartel de "VENDO"
 * que se pega del lado de adentro de la luneta.
 *
 * Es la regla de la oblea y la cédula: cuando una pantalla necesita un
 * contenedor, se usa el objeto que la gente ya conoce para eso. El cartel de
 * la librería trae impreso "VENDO" y renglones para completar con fibrón, y es
 * exactamente lo que hace este panel: muestra lo que ya se completó y deja
 * vacío el renglón de lo que falta. Antes era una lista de "Vehículo —",
 * "Precio —" que decía lo mismo sin que nadie la mirara.
 *
 * Los renglones vacíos no llevan texto de relleno: un renglón en blanco en un
 * cartel se entiende solo.
 */
export function CartelVendo({
  make,
  model,
  trim,
  year,
  mileage,
  price,
  currency,
  whatsapp,
  city,
}: CartelVendoProps) {
  const auto = [make.trim(), model.trim()].filter(Boolean).join(' ')
  const renglones: { label: string; value: string; wide?: boolean }[] = [
    { label: 'Marca y modelo', value: [auto, trim.trim()].filter(Boolean).join(' '), wide: true },
    { label: 'Año', value: year },
    { label: 'Km', value: mileage ? conPuntos(mileage) : '' },
    { label: 'Precio', value: price ? `${currency} ${conPuntos(price)}` : '', wide: true },
    { label: 'Tel.', value: whatsapp.trim() },
    { label: 'Zona', value: city.trim() },
  ]

  return (
    <div className="cartel">
      <span className="cartel__cinta cartel__cinta--izq" aria-hidden="true" />
      <span className="cartel__cinta cartel__cinta--der" aria-hidden="true" />
      <p className="cartel__vendo" aria-hidden="true">
        Vendo
      </p>
      <dl className="cartel__renglones">
        {renglones.map((renglon) => (
          <div
            key={renglon.label}
            className={renglon.wide ? 'cartel__renglon cartel__renglon--wide' : 'cartel__renglon'}
          >
            <dt>{renglon.label}</dt>
            <dd className={renglon.value ? 'cartel__valor' : 'cartel__valor is-empty'}>
              {renglon.value || <span className="sr-only">Sin completar</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
