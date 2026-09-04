import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SellerCard } from '../components/seller/SellerCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { FavoriteButton } from '../components/vehicle/FavoriteButton'
import { VehicleGallery } from '../components/vehicle/VehicleGallery'
import { VehicleGrid } from '../components/vehicle/VehicleGrid'
import { VehicleSpecs } from '../components/vehicle/VehicleSpecs'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useFavorites } from '../hooks/useFavorites'
import {
  getSeller,
  getSimilarVehicles,
  getVehicleBySlug,
  NotFoundError,
  registerView,
} from '../lib/api'
import {
  conditionLabels,
  formatPrice,
  locationLabel,
  relativeDate,
  vehicleMeta,
  vehicleTitle,
} from '../lib/format'
import { listingMessage, whatsappLink } from '../lib/whatsapp'
import type { Seller, Vehicle } from '../types'
import './VehicleDetail.css'

type Status = 'loading' | 'ready' | 'notfound'

export function VehicleDetail() {
  const { slug = '' } = useParams()
  const { has, toggle } = useFavorites()

  /* La publicación cargada se guarda junto al slug que la pidió: comparar ese
     slug con el de la URL es lo que dice si estamos cargando. */
  const [loaded, setLoaded] = useState<{
    slug: string
    vehicle: Vehicle | null
    failed: boolean
  }>({ slug: '', vehicle: null, failed: false })

  const [seller, setSeller] = useState<Seller | null>(null)
  const [similar, setSimilar] = useState<Vehicle[]>([])

  useEffect(() => {
    let current = true

    getVehicleBySlug(slug)
      .then(async (found) => {
        if (!current) return
        setLoaded({ slug, vehicle: found, failed: false })

        /* La visita se cuenta y se olvida: si falla, no pasa nada. Es una
           métrica, no el contenido de la página. */
        void registerView(slug)

        const [itsSeller, alike] = await Promise.all([
          getSeller(found.sellerId),
          getSimilarVehicles(found),
        ])
        if (!current) return
        setSeller(itsSeller)
        setSimilar(alike)
      })
      .catch((cause: unknown) => {
        /* Un fallo de red no es lo mismo que un aviso inexistente: decirle al
           usuario que no existe cuando en realidad se cayo la conexion lo manda
           a buscar en otro lado por nada. */
        if (!(cause instanceof NotFoundError)) console.error('getVehicleBySlug', cause)
        if (current) setLoaded({ slug, vehicle: null, failed: true })
      })

    return () => {
      current = false
    }
  }, [slug])

  const fresh = loaded.slug === slug
  const status: Status = !fresh ? 'loading' : loaded.failed ? 'notfound' : 'ready'
  const vehicle = fresh ? loaded.vehicle : null

  const metaTitle = vehicle
    ? `${vehicleTitle(vehicle)} ${vehicle.year} · ${formatPrice(vehicle.price, vehicle.currency)} | Autana`
    : 'Autana'

  useDocumentMeta({
    title: metaTitle,
    description: vehicle
      ? `${vehicleMeta(vehicle)} en ${locationLabel(vehicle.location)}. ${vehicle.description.slice(0, 120)}`
      : undefined,
    image: vehicle?.images[0]?.url,
    /* Le dice a Google que esto es un vehículo en venta, con su precio. Es lo
       que habilita los resultados enriquecidos en la búsqueda. */
    structuredData: vehicle
      ? {
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: vehicleTitle(vehicle),
          brand: { '@type': 'Brand', name: vehicle.make },
          model: vehicle.model,
          vehicleModelDate: String(vehicle.year),
          mileageFromOdometer: { '@type': 'QuantitativeValue', value: vehicle.mileage, unitCode: 'KMT' },
          fuelType: vehicle.fuelType,
          vehicleTransmission: vehicle.transmission,
          color: vehicle.color || undefined,
          image: vehicle.images.map((photo) => photo.url).filter(Boolean),
          offers: {
            '@type': 'Offer',
            price: vehicle.price,
            priceCurrency: vehicle.currency,
            availability: 'https://schema.org/InStock',
          },
        }
      : undefined,
  })

  if (status === 'notfound') {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="No encontramos esa publicación"
          description="Puede que se haya vendido o que el vendedor la haya dado de baja."
          action={
            <Link to="/cars">
              <Button variant="yellow">Ver todos los autos</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="page detail">
        <div className="detail__main">
          <Skeleton height="470px" radius="20px" />
        </div>
        <aside className="detail__aside">
          <div className="card card--pad detail__panel">
            <Skeleton height="30px" width="80%" />
            <Skeleton height="18px" width="60%" />
            <Skeleton height="38px" width="50%" />
            <Skeleton height="56px" />
          </div>
        </aside>
      </div>
    )
  }

  const title = vehicleTitle(vehicle)
  const saved = has(vehicle.id)

  /* El comprador escribe al vendedor por WhatsApp con el link ya armado. */
  const contactHref = seller?.whatsapp
    ? whatsappLink(seller.whatsapp, listingMessage(title, window.location.href))
    : null

  return (
    <>
      <nav className="page detail__breadcrumb" aria-label="Ruta de navegación">
        <Link to="/cars">Autos</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/cars?make=${encodeURIComponent(vehicle.make)}`}>{vehicle.make}</Link>
        <span aria-hidden="true">/</span>
        <span className="detail__breadcrumb-current">
          {vehicle.model} {vehicle.year}
        </span>
      </nav>

      <div className="page detail">
        <div className="detail__main">
          <VehicleGallery vehicle={vehicle}>
            {vehicle.condition !== 'used' && (
              <Badge
                tone={vehicle.condition === 'new' ? 'dark' : 'outline'}
                className="gallery__badge"
              >
                {conditionLabels[vehicle.condition]}
              </Badge>
            )}
            <FavoriteButton vehicleId={vehicle.id} title={title} className="gallery__fav" />
          </VehicleGallery>

          <section className="detail__section">
            <h2 className="detail__heading">Especificaciones</h2>
            <VehicleSpecs vehicle={vehicle} />
          </section>

          <section className="detail__section">
            <h2 className="detail__heading">Descripción del vendedor</h2>
            <p className="detail__description">{vehicle.description}</p>
          </section>

          <section className="detail__section">
            <h2 className="detail__heading">Vendedor</h2>
            {seller ? (
              <SellerCard seller={seller} level={vehicle.sellerLevel} />
            ) : (
              <Skeleton height="116px" />
            )}
          </section>
        </div>

        <aside className="detail__aside">
          <div className="card detail__panel">
            <div className="detail__panel-top">
              {vehicle.condition !== 'used' && (
                <Badge tone="outline">{conditionLabels[vehicle.condition]}</Badge>
              )}
              <span className="over">Publicado {relativeDate(vehicle.createdAt)}</span>
            </div>

            <h1 className="detail__title">{title}</h1>
            <p className="detail__meta mono">
              {vehicleMeta(vehicle)} · {locationLabel(vehicle.location)}
            </p>

            <p className="detail__price mono">{formatPrice(vehicle.price, vehicle.currency)}</p>
            {vehicle.negotiable && (
              <p className="detail__negotiable">El vendedor acepta ofertas</p>
            )}

            <div className="detail__actions">
              {contactHref ? (
                <a
                  className="btn btn--yellow btn--lg btn--block"
                  href={contactHref}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Icon name="message" size={18} />
                  Contactar por WhatsApp
                </a>
              ) : (
                <Button variant="yellow" size="lg" block disabled>
                  Contacto no disponible
                </Button>
              )}
              <div className="detail__actions-pair">
                <Button variant="outline" block onClick={() => toggle(vehicle.id)}>
                  <Icon name="heart" size={16} />
                  {saved ? 'Guardado' : 'Guardar'}
                </Button>
                <Button variant="outline" block>
                  <Icon name="grid" size={16} />
                  Comparar
                </Button>
              </div>
            </div>

            <hr className="rule detail__panel-rule" />

            <p className="detail__safety">
              <Icon name="check" size={16} />
              Nunca transfieras dinero antes de ver el vehículo. Autana no interviene en el pago.
            </p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="section section--tinted detail__similar">
          <div className="page">
            <div className="section__head">
              <h2>Vehículos similares</h2>
              <Link to={`/cars?bodyType=${vehicle.bodyType}`} className="detail__similar-link">
                Ver más como este
                <Icon name="arrowRight" size={15} />
              </Link>
            </div>
            <VehicleGrid vehicles={similar} />
          </div>
        </section>
      )}
    </>
  )
}
