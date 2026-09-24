import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'
import { CompareButton } from './CompareButton'
import { FavoriteButton } from './FavoriteButton'
import { InterestButton } from './InterestButton'
import { VehicleMedia } from './VehicleMedia'
import { formatMileage, formatPrice, locationLabel, vehicleTitle } from '../../lib/format'
import { rebaja } from '../../lib/rebaja'
import type { Vehicle } from '../../types'
import './VehicleCard.css'

interface VehicleCardProps {
  vehicle: Vehicle
  /** `list` alarga la card en horizontal para la vista de lista. */
  layout?: 'grid' | 'list'
  /** La primera de la pantalla: su foto se baja antes que el resto. */
  priority?: boolean
}

/**
 * Quién vende, en una línea, sólo cuando dice algo.
 *
 * Una concesionaria va con su nombre, que es una marca que se puede buscar, y
 * la tilde si está verificada. Un particular no: su nombre no le dice nada a
 * quien mira la grilla. Lo que sí sirve es el hecho ---verificada, o desde
 * cuándo tiene cuenta---, porque una cuenta de esta semana publicando un auto
 * caro es justo lo que conviene que se vea. Va en gris y sin sello de color:
 * en un sitio que arranca casi todas las cuentas son nuevas, y pintarlas
 * haría ver sospechoso al sitio entero. Una cuenta con tiempo y sin verificar
 * no dice nada, así que no se muestra.
 */
function SellerLine({ vehicle }: { vehicle: Vehicle }) {
  const trust = vehicle.sellerTrust
  const dealer = vehicle.sellerType === 'dealer'
  /* Un particular con cuenta de hace un año y sin verificar no tiene nada
     que decir, y "Particular · desde ago 2025" en cada caja es ruido. */
  if (!dealer && !trust?.verified && !trust?.isNew) return null

  return (
    <span className="vcard__seller">
      {dealer ? vehicle.sellerName || 'Concesionaria' : trust?.verified ? 'Particular' : 'Cuenta nueva'}
      {trust?.verified && (
        <span className="vcard__verified" role="img" aria-label="verificada" title="Cuenta verificada">
          <Icon name="check" size={9} strokeWidth={2.6} />
        </span>
      )}
    </span>
  )
}

/**
 * La caja de cada aviso en los listados.
 *
 * Tenía de todo: sello de condición, contador de fotos, fecha, dos o tres
 * badges, un botón amarillo lleno, otro de comparar y el contador de
 * interesados. Cada cosa tenía su razón, pero juntas competían con lo único
 * que se mira al recorrer una grilla: la foto, qué auto es y cuánto sale.
 *
 * Quedó lo que se necesita para decidir si entrar, en el orden en que se lee:
 * qué es, quién lo vende si importa, el precio, año y kilómetros, dónde está.
 * "0 km" ya lo dice el kilometraje. Lo demás está a un toque, en la ficha.
 */
export function VehicleCard({ vehicle, layout = 'grid', priority = false }: VehicleCardProps) {
  const title = vehicleTitle(vehicle)
  const name = `${title} ${vehicle.year}`
  const bajo = rebaja(vehicle)

  return (
    <article className={`vcard vcard--${layout}`}>
      <div className="vcard__media">
        <VehicleMedia vehicle={vehicle} priority={priority} />
        {vehicle.condition === 'certified' && (
          <Badge tone="dark" className="vcard__condition">
            Certificado
          </Badge>
        )}
        <div className="vcard__tools">
          <CompareButton slug={vehicle.slug} title={name} compact />
          <FavoriteButton vehicleId={vehicle.id} title={name} />
        </div>
      </div>

      <div className="vcard__body">
        <h3 className="vcard__title">
          {/* El link cubre la card entera; los botones quedan encima. */}
          <Link to={`/autos/${vehicle.slug}`} className="vcard__link">
            {title}
          </Link>
        </h3>
        <SellerLine vehicle={vehicle} />

        {/* Si bajó hace poco, el precio de antes tachado y cuánto menos. El
            "antes" lo escribe la base, nunca el vendedor (028). */}
        {bajo && (
          <span className="vcard__was">
            <span className="sr-only">Antes </span>
            <s>{formatPrice(bajo.before, vehicle.currency)}</s>
            <span className="vcard__off">{bajo.percent}% menos</span>
          </span>
        )}
        <span className={bajo ? 'vcard__price vcard__price--after' : 'vcard__price'}>
          {bajo && <span className="sr-only">Ahora </span>}
          {formatPrice(vehicle.price, vehicle.currency)}
        </span>
        <span className="vcard__meta">
          {vehicle.year}
          <span className="vcard__sep" aria-hidden="true" />
          {formatMileage(vehicle.mileage)}
        </span>
        <span className="vcard__location">{locationLabel(vehicle.location)}</span>

        <div className="vcard__actions">
          <InterestButton vehicle={vehicle} title={title} />
        </div>
      </div>
    </article>
  )
}
