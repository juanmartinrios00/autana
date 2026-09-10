import { formatCount } from '../../lib/format'
import type { MarketplaceStats } from '../../lib/api'
import './HomeSections.css'

interface MarketplaceProofProps {
  stats: MarketplaceStats
}

const label = (value: number, singular: string, plural: string) =>
  `${value === 1 ? singular : plural} en Autana`

export function MarketplaceProof({ stats }: MarketplaceProofProps) {
  const items = [
    {
      category: 'Inventario',
      description: label(stats.listings, 'publicación activa', 'publicaciones activas'),
      value: formatCount(stats.listings),
    },
    {
      category: 'Variedad',
      description: label(stats.makes, 'marca disponible', 'marcas disponibles'),
      value: formatCount(stats.makes),
    },
    {
      category: 'Cobertura',
      description: label(stats.provinces, 'provincia representada', 'provincias representadas'),
      value: formatCount(stats.provinces),
    },
    {
      category: 'Publicación',
      description: 'comisión por vender tu vehículo',
      value: '0%',
    },
  ]

  return (
    <section className="proof" aria-labelledby="proof-title">
      <header className="proof__head">
        <span className="over">Datos del marketplace</span>
        <h2 className="proof__title" id="proof-title">
          Lo importante, sin letra chica.
        </h2>
      </header>

      <div className="proof__grid">
        {items.map((item) => (
          <article className="proof__card" key={item.category}>
            <div className="proof__meta">
              <span className="proof__category">▸ {item.category}</span>
              <span className="proof__description">{item.description}</span>
            </div>
            <strong className="proof__value">{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
