import { formatCount } from '../../lib/format'
import type { MarketplaceStats } from '../../lib/api'
import './MarketplaceProof.css'

interface MarketplaceProofProps {
  stats: MarketplaceStats
}

const label = (value: number, singular: string, plural: string) =>
  `${value === 1 ? singular : plural} en Autana`

/**
 * La banda de números, a todo el ancho.
 *
 * Va pegada al hero y sin margen a los costados a propósito: es un corte de
 * color entre dos bloques de contenido, y una banda con aire alrededor deja de
 * cortar.
 *
 * Los números salen de la base, no de un archivo de constantes. Si hay una
 * publicación, dice una. Es la misma regla que sigue /dealers: un número
 * inflado en la portada se desmiente solo en cuanto alguien toca "ver todos".
 */
export function MarketplaceProof({ stats }: MarketplaceProofProps) {
  const items = [
    {
      value: formatCount(stats.listings),
      description: label(stats.listings, 'publicación activa', 'publicaciones activas'),
    },
    {
      value: formatCount(stats.makes),
      description: label(stats.makes, 'marca disponible', 'marcas disponibles'),
    },
    {
      value: formatCount(stats.provinces),
      description: label(stats.provinces, 'provincia representada', 'provincias representadas'),
    },
    {
      value: '0%',
      description: 'comisión por vender tu vehículo',
    },
  ]

  return (
    <section className="proof" aria-labelledby="proof-title">
      <div className="page proof__head">
        <span className="over">Datos del marketplace</span>
        <h2 className="proof__title" id="proof-title">
          Lo importante, sin letra chica.
        </h2>
      </div>

      <div className="proof__band">
        {items.map((item) => (
          <article className="proof__cell" key={item.description}>
            <strong className="proof__value">{item.value}</strong>
            <span className="proof__label">{item.description}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
