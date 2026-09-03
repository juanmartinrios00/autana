import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import { Badge } from '../ui/Badge'
import { locationLabel } from '../../lib/format'
import type { Seller } from '../../types'
import './HomeSections.css'

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Sale de la base, no de una lista inventada. Mientras no haya concesionarias
 * publicando, la sección no existe: mostrar agencias falsas en un sitio que se
 * comparte sería inventar negocios que no son.
 */
export function DealerSlider({ dealers }: { dealers: Seller[] }) {
  if (dealers.length === 0) return null

  return (
    <Slider eyebrow="Vendedores" title="Concesionarias en Autana" itemWidth="260px">
      {dealers.map((dealer) => (
        <Link key={dealer.id} to={`/cars?sellerType=dealer`} className="dealer">
          <span className="dealer__avatar" aria-hidden="true">
            {initials(dealer.name)}
          </span>
          <span className="dealer__name">{dealer.name}</span>
          <span className="dealer__location">{locationLabel(dealer.location)}</span>
          <span className="dealer__foot">
            <span className="mono dealer__count">
              {dealer.listingCount} {dealer.listingCount === 1 ? 'auto' : 'autos'}
            </span>
            {dealer.verified && <Badge tone="success">Verificada</Badge>}
          </span>
        </Link>
      ))}
    </Slider>
  )
}
