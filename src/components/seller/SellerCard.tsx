import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { locationLabel, sellerTypeLabels } from '../../lib/format'
import type { Seller } from '../../types'
import type { TrustSignal } from '../../lib/trust'

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface SellerCardProps {
  seller: Seller
  /**
   * Los hechos del vendedor. Acá se muestran siempre: es la pantalla donde el
   * comprador decide a quién escribirle, así que es donde más vale que estén
   * completos y sin adornar.
   */
  trust?: TrustSignal
}

export function SellerCard({ seller, trust }: SellerCardProps) {
  return (
    <div className="seller card">
      <span className="seller__avatar" aria-hidden="true">
        {initials(seller.name)}
      </span>

      <div className="seller__info">
        <div className="seller__name-row">
          <h3 className="seller__name">{seller.name}</h3>
          {seller.verified && <Badge tone="success">Verificada</Badge>}
        </div>

        <div className="seller__meta">
          <span>{sellerTypeLabels[seller.type]}</span>
          <span className="seller__dot" aria-hidden="true">·</span>
          <span>{locationLabel(seller.location)}</span>
          <span className="seller__dot" aria-hidden="true">·</span>
          <span className="mono">{seller.listingCount} publicaciones</span>
          {trust && (
            <>
              <span className="seller__dot" aria-hidden="true">·</span>
              {/* La antigüedad no impresiona en un marketplace nuevo, pero es
                  lo único que no se consigue apurado. Va en palabras y no como
                  sello para que se lea como dato, no como premio. */}
              <span>{trust.since}</span>
            </>
          )}
          {seller.rating !== null && (
            <>
              <span className="seller__dot" aria-hidden="true">·</span>
              <span className="seller__rating">
                <span className="mono">{seller.rating.toFixed(1).replace('.', ',')}</span>
                <span className="seller__reviews">({seller.reviewCount})</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="seller__actions">
        <Button variant="outline" size="sm">
          Ver publicaciones
        </Button>
        <Button variant="outline" size="sm">
          Contactar
        </Button>
      </div>
    </div>
  )
}
