import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { CompareButton } from './CompareButton'
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
            {/* Hechos, no un sello ganado. `Verificada` la pone una persona a
                mano y es la senial fuerte; cuando no esta, queda la antiguedad,
                que es lo unico que no se puede falsificar apurado. Una cuenta
                de esta semana publicando un auto caro es justo lo que conviene
                que se vea. */}
            {vehicle.sellerTrust &&
              (vehicle.sellerTrust.verified ? (
                <Badge tone="success" className="vcard__trust">
                  Verificada
                </Badge>
              ) : (
                /* "Cuenta nueva" va en tono neutro, no de alerta. Una cuenta
                   recien creada no es evidencia de nada malo, y ademas en un
                   marketplace que arranca son casi todas: pintarlas de amarillo
                   haria ver sospechoso al sitio entero. El hecho informa, el
                   color no opina. */
                <Badge tone="tint" className="vcard__trust">
                  {vehicle.sellerTrust.sinceShort}
                </Badge>
              ))}
            {vehicle.sellerType && (
              <Badge className="vcard__seller">{sellerTypeLabels[vehicle.sellerType]}</Badge>
            )}
          </span>
        </div>

        {/* Va en su propia fila y no dentro del pie: ahí conviven la ubicación
            y los sellos del vendedor, y un tercer elemento rompe el reparto. */}
        <CompareButton slug={vehicle.slug} title={title} className="vcard__compare" />
      </div>
    </article>
  )
}
