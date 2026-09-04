import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { FavoriteButton } from './FavoriteButton'
import { VehicleMedia } from './VehicleMedia'
import {
  conditionLabels,
  formatPrice,
  locationLabel,
  sellerTypeLabels,
  vehicleMeta,
  vehicleTitle,
} from '../../lib/format'
import type { Vehicle } from '../../types'
import './VehicleCard.css'

interface VehicleCardProps {
  vehicle: Vehicle
  /** `list` alarga la card en horizontal para la vista de lista. */
  layout?: 'grid' | 'list'
}

export function VehicleCard({ vehicle, layout = 'grid' }: VehicleCardProps) {
  const title = vehicleTitle(vehicle)

  return (
    <article className={`vcard vcard--${layout}`}>
      <div className="vcard__media">
        <VehicleMedia vehicle={vehicle} />
        {vehicle.condition !== 'used' && (
          <Badge
            tone={vehicle.condition === 'new' ? 'dark' : 'outline'}
            className="vcard__condition"
          >
            {conditionLabels[vehicle.condition]}
          </Badge>
        )}
        <FavoriteButton vehicleId={vehicle.id} title={title} className="vcard__fav" />
      </div>

      <div className="vcard__body">
        <h3 className="vcard__title">
          {/* El link cubre la card entera; el resto del contenido queda encima. */}
          <Link to={`/cars/${vehicle.slug}`} className="vcard__link">
            {title}
          </Link>
        </h3>

        <span className="vcard__meta mono">{vehicleMeta(vehicle)}</span>
        <span className="vcard__price mono">{formatPrice(vehicle.price, vehicle.currency)}</span>

        <hr className="rule" />

        <div className="vcard__foot">
          <span className="vcard__location">{locationLabel(vehicle.location)}</span>
          <span className="vcard__seller-info">
            {/* Desde nivel 2. En el primero el sello diria "Recién llegado" en
                cada card de un marketplace nuevo, y eso castiga justo a quien
                recien se suma. En el detalle si se muestra siempre. */}
            {vehicle.sellerLevel && vehicle.sellerLevel.level > 1 && (
              <Badge tone="tint" className="vcard__level">
                {vehicle.sellerLevel.title}
              </Badge>
            )}
            {vehicle.sellerType && (
              <Badge className="vcard__seller">{sellerTypeLabels[vehicle.sellerType]}</Badge>
            )}
          </span>
        </div>
      </div>
    </article>
  )
}
