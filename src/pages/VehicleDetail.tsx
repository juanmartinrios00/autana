import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SellerCard } from '../components/seller/SellerCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { FavoriteButton } from '../components/vehicle/FavoriteButton'
import { InterestButton } from '../components/vehicle/InterestButton'
import { VehicleGallery } from '../components/vehicle/VehicleGallery'
import { VehicleGrid } from '../components/vehicle/VehicleGrid'
import { VehicleSpecs } from '../components/vehicle/VehicleSpecs'
import { ReportDialog } from '../components/vehicle/ReportDialog'
import { ShareButton } from '../components/vehicle/ShareButton'
import { BRAND, pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useCompare } from '../hooks/useCompare'
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
import { interestLabel } from '../lib/contact'
import type { Seller, Vehicle } from '../types'
import './VehicleDetail.css'
import { reportError } from '../lib/report'

type Status = 'loading' | 'ready' | 'notfound' | 'error'

export function VehicleDetail() {
  const { session } = useAuth()
  const { slug = '' } = useParams()
  const { has, toggle } = useFavorites()
  const compare = useCompare()

  /* La publicación cargada se guarda junto al slug que la pidió: comparar ese
     slug con el de la URL es lo que dice si estamos cargando. */
  const [loaded, setLoaded] = useState<{
    slug: string
    vehicle: Vehicle | null
    failure: 'notfound' | 'error' | null
  }>({ slug: '', vehicle: null, failure: null })

  const [attempt, setAttempt] = useState(0)

  /* El vendedor y los similares también se guardan con su slug. Sin eso, al
     pasar de un auto a otro la ficha nueva ya está en pantalla mientras estos
     dos siguen viajando, y durante ese rato se lee el vendedor del auto
     anterior debajo del auto nuevo: no es un dato que falta, es uno equivocado
     y con cara de bueno. `seller` en null adentro del objeto quiere decir que
     se pidió y no vino. */
  const [seller, setSeller] = useState<{ slug: string; seller: Seller | null } | null>(null)
  /* El contacto ya no se pide al abrir la ficha: lo trae "Me interesa", que
     pide cuenta y suma al contador (migración 014). Acá sólo queda el número
     de interesados, que sube si se toca en esta misma ficha. */
  const [interest, setInterest] = useState<{ slug: string; count: number } | null>(null)
  const [similar, setSimilar] = useState<{ slug: string; items: Vehicle[] } | null>(null)

  /**
   * La barra de contacto fija del celular aparece cuando "Me interesa" se fue
   * de pantalla.
   *
   * En el celular la ficha es una columna larga ---fotos, especificaciones,
   * vendedor, similares--- y el botón queda arriba de todo: quien baja a mirar
   * se queda sin forma de contactar sin volver a subir.
   *
   * Se mira el botón real en vez de contar píxeles scrolleados: si el panel
   * cambia de lugar, esto sigue andando.
   */
  const actionsRef = useRef<HTMLDivElement>(null)
  const [contactOut, setContactOut] = useState(false)

  useEffect(() => {
    let current = true

    getVehicleBySlug(slug)
      .then((found) => {
        if (!current) return
        setLoaded({ slug, vehicle: found, failure: null })

        /* La visita se cuenta y se olvida: si falla, no pasa nada. Es una
           métrica, no el contenido de la página. */
        void registerView(slug)

        /* Los dos van por su cuenta y cada uno se cae solo. Pedidos juntos y
           esperados con un `await`, un tropiezo de red buscando el vendedor se
           llevaba puesta la ficha entera, que ya estaba cargada y bien. */
        void getSeller(found.sellerId)
          .then((its) => {
            if (current) setSeller({ slug, seller: its })
          })
          .catch((cause: unknown) => {
            reportError('getSeller', cause)
            if (current) setSeller({ slug, seller: null })
          })

        void getSimilarVehicles(found)
          .then((alike) => {
            if (current) setSimilar({ slug, items: alike })
          })
          .catch((cause: unknown) => {
            reportError('getSimilarVehicles', cause)
            if (current) setSimilar({ slug, items: [] })
          })
      })
      .catch((cause: unknown) => {
        /* Un fallo de red no es lo mismo que un aviso inexistente: decirle al
           usuario que no existe cuando en realidad se cayó la conexión lo manda
           a buscar en otro lado por nada. Uno se cierra con «no está»; el otro
           tiene arreglo y se ofrece reintentar. */
        const missing = cause instanceof NotFoundError
        if (!missing) reportError('getVehicleBySlug', cause)
        if (current) setLoaded({ slug, vehicle: null, failure: missing ? 'notfound' : 'error' })
      })

    return () => {
      current = false
    }
  }, [slug, attempt])

  const fresh = loaded.slug === slug
  const status: Status = !fresh ? 'loading' : (loaded.failure ?? 'ready')
  const vehicle = fresh ? loaded.vehicle : null

  /* Depende del aviso porque el nodo se monta con él: yendo de un auto a otro
     por "similares", el observador tiene que mirar el botón nuevo. */
  useEffect(() => {
    const node = actionsRef.current
    if (!node) return

    const observer = new IntersectionObserver(([entry]) => setContactOut(!entry?.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [vehicle?.id])

  /* En el aviso propio no hay botón de contacto, así que tampoco barra: sería
     una franja con el precio y nada más. */
  const own = Boolean(session && vehicle && session.user.id === vehicle.sellerId)

  /* Del auto que está en pantalla, no del anterior. */
  const itsSeller = seller?.slug === slug ? seller : null
  const similarNow = similar?.slug === slug ? similar.items : []

  const metaTitle = vehicle
    ? pageTitle(`${vehicleTitle(vehicle)} ${vehicle.year} · ${formatPrice(vehicle.price, vehicle.currency)}`)
    : BRAND

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

  if (status === 'error') {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="close"
          title="No pudimos cargar la publicación"
          description="Revisá tu conexión e intentá de nuevo."
          action={
            <Button variant="yellow" onClick={() => setAttempt((count) => count + 1)}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="No encontramos esa publicación"
          description="Puede que se haya vendido o que el vendedor la haya dado de baja."
          action={
            <Link to="/autos">
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

  const interestCount = interest?.slug === vehicle.slug ? interest.count : vehicle.interestCount
  const interestText = interestLabel(interestCount)

  return (
    <>
      <nav className="page detail__breadcrumb" aria-label="Ruta de navegación">
        <Link to="/autos">Autos</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/autos?make=${encodeURIComponent(vehicle.make)}`}>{vehicle.make}</Link>
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

          {/* Igual que el vendedor de abajo: sin descripción, sin título. */}
          {vehicle.description.trim() && (
            <section className="detail__section">
              <h2 className="detail__heading">Descripción del vendedor</h2>
              <p className="detail__description">{vehicle.description}</p>
            </section>
          )}

          {/* Si el vendedor no vino, el bloque no queda como título con un
              hueco abajo: se va entero. */}
          {(!itsSeller || itsSeller.seller) && (
            <section className="detail__section">
              <h2 className="detail__heading">Vendedor</h2>
              {itsSeller?.seller ? (
                <SellerCard seller={itsSeller.seller} trust={vehicle.sellerTrust} />
              ) : (
                <Skeleton height="116px" />
              )}
            </section>
          )}
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

            {interestText && (
              /* El cartel va arriba del botón y no abajo: es lo que empuja a
                 tocarlo, y leído después ya no empuja nada. */
              <p className="detail__interest">
                <Icon name="user" size={15} />
                {interestText} este vehículo
              </p>
            )}

            <div className="detail__actions" ref={actionsRef}>
              <InterestButton
                vehicle={vehicle}
                title={title}
                size="detail"
                onCount={(count) => setInterest({ slug: vehicle.slug, count })}
              />
              <div className="detail__actions-pair">
                <Button variant="outline" block onClick={() => toggle(vehicle.id)}>
                  <Icon name="heart" size={16} />
                  {saved ? 'Guardado' : 'Guardar'}
                </Button>
                {/* Este botón no hacía nada: tenía el ícono y el texto pero no
                    la acción. El de las cajas del listado sí andaba porque es
                    otro componente. Mismo criterio que ese: con tres elegidos
                    no se suma otro, pero sacar el propio sigue disponible. */}
                <Button
                  variant="outline"
                  block
                  aria-pressed={compare.has(vehicle.slug)}
                  disabled={compare.full && !compare.has(vehicle.slug)}
                  title={
                    compare.full && !compare.has(vehicle.slug)
                      ? 'Ya elegiste tres autos para comparar'
                      : undefined
                  }
                  onClick={() => compare.toggle(vehicle.slug)}
                >
                  <Icon name={compare.has(vehicle.slug) ? 'check' : 'grid'} size={16} />
                  {compare.has(vehicle.slug) ? 'Comparando' : 'Comparar'}
                </Button>
              </div>
              {/* Compartir va acá abajo y a lo ancho: un auto se pasa por
                  WhatsApp, y hasta ahora había que copiar la dirección de la
                  barra del navegador a mano. */}
              <ShareButton
                title={`${title} ${vehicle.year}`}
                price={formatPrice(vehicle.price, vehicle.currency)}
                block
              />
            </div>

            <hr className="rule detail__panel-rule" />

            <p className="detail__safety">
              <Icon name="check" size={16} />
              Nunca transfieras dinero antes de ver el vehículo. {BRAND} no interviene en el pago.
            </p>

            {/* Al final y en voz baja: tiene que estar a mano para quien lo
                necesita, sin competirle al botón de contactar. */}
            <div className="detail__report">
              <ReportDialog kind="listing" targetId={vehicle.id} title={title} />
            </div>
          </div>
        </aside>
      </div>

      {/* Sólo en el celular (lo esconde el CSS) y sólo cuando el botón de
          arriba no está a la vista. El precio va al lado: es la otra mitad de
          la decisión, y volver a buscarlo obliga a subir. */}
      {contactOut && !own && (
        <div className="detail__bar" role="region" aria-label="Contactar">
          <span className="detail__bar-price mono">
            {formatPrice(vehicle.price, vehicle.currency)}
          </span>
          <InterestButton
            vehicle={vehicle}
            title={title}
            onCount={(count) => setInterest({ slug: vehicle.slug, count })}
          />
        </div>
      )}

      {similarNow.length > 0 && (
        <section className="section detail__similar">
          <div className="page">
            <div className="section__panel">
              <div className="section__head">
                <h2>Vehículos similares</h2>
                <Link to={`/autos?bodyType=${vehicle.bodyType}`} className="detail__similar-link">
                  Ver más como este
                  <Icon name="arrowRight" size={15} />
                </Link>
              </div>
              <VehicleGrid vehicles={similarNow} />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
