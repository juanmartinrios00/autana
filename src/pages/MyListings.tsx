import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MissionCard } from '../components/levels/MissionCard'
import { ListingManager } from '../components/listing/ListingManager'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { BRAND, pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { deleteListing, getMyListingStats, listMyListings, setListingStatus, type ListingDay } from '../lib/api'
import { listingMission } from '../lib/missions'
import { fillDays, summarize } from '../lib/stats'
import type { ListingStatus, Vehicle } from '../types'
import './MyListings.css'
import { reportError } from '../lib/report'

/**
 * Los autos que publicaste, con todo lo que se puede hacer con ellos.
 *
 * Vive en su propia ruta y no dentro del perfil porque son dos trabajos
 * distintos: el perfil es lo que mostrás —el garage se comparte por link— y
 * esto es el panel de quien vende. Mezclarlos obligaba a entrar a una página
 * pública para hacer algo privado.
 */
export function MyListings() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  const [listings, setListings] = useState<Vehicle[]>([])
  /* Qué usuario quedó cargado. Comparándolo con el de la sesión sale si
     estamos esperando, sin un `loading` que prender y apagar a mano. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  /* Cómo le fue a cada aviso. Si falla, la pantalla se muestra igual sin los
     gráficos: es el agregado, no lo que la persona vino a ver. */
  const [stats, setStats] = useState<Record<string, ListingDay[]>>({})
  const [reloads, setReloads] = useState(0)

  useDocumentMeta({
    title: pageTitle('Mis publicaciones'),
    description: `Los autos que publicaste en ${BRAND}.`,
  })

  useEffect(() => {
    if (!userId) return
    let current = true

    void listMyListings(userId)
      .then((found) => {
        if (!current) return
        setListings(found)
        setFailed(false)
      })
      .catch((cause) => {
        if (!current) return
        reportError('listMyListings', cause)
        setFailed(true)
      })
      .finally(() => {
        if (current) setLoadedFor(userId)
      })

    void getMyListingStats()
      .then((found) => {
        if (current) setStats(found)
      })
      .catch(() => {})

    return () => {
      current = false
    }
  }, [userId, reloads])

  const loading = loadedFor !== userId

  async function handleStatusChange(id: string, next: ListingStatus) {
    await setListingStatus(id, next)
    setReloads((count) => count + 1)
  }

  async function handleDelete(id: string) {
    await deleteListing(id)
    setReloads((count) => count + 1)
  }

  const active = listings.filter((item) => item.status === 'active').length

  /* El resumen de la semana, sumando todos los avisos. Es el número que
     contesta "¿cómo me está yendo?" sin tener que mirar aviso por aviso, y es
     también lo que una concesionaria mira antes de decidir si esto le sirve. */
  const semana = Object.values(stats).reduce(
    (total, dias) => {
      const resumen = summarize(fillDays(dias, 14))
      return { views: total.views + resumen.views, interests: total.interests + resumen.interests }
    },
    { views: 0, interests: 0 },
  )
  /* Sale de los mismos avisos que se muestran, así que se recalcula sola al
     sumar fotos o marcar uno vendido: la recarga que ya hace cada acción. */
  const mission = loading || failed ? null : listingMission(listings)

  return (
    <div className="page section mylistings-page">
      <header className="mylistings-page__head">
        <div className="mylistings-page__titles">
          <Link to="/perfil" className="mylistings-page__back">
            <Icon name="arrowLeft" size={15} />
            Volver a mi perfil
          </Link>
          <h1 className="mylistings-page__title">Mis publicaciones</h1>
          {!loading && !failed && listings.length > 0 && (
            <p className="mylistings-page__count">
              {listings.length} {listings.length === 1 ? 'aviso' : 'avisos'} · {active}{' '}
              {active === 1 ? 'activo' : 'activos'}
            </p>
          )}

          {/* Sólo con movimiento: "0 visitas esta semana" arriba de todo es un
              cartel de fracaso los primeros días, cuando todavía no puede
              haber pasado nada. */}
          {semana.views > 0 && (
            <p className="mylistings-page__week">
              Esta semana: <strong>{semana.views}</strong>{' '}
              {semana.views === 1 ? 'visita' : 'visitas'} y <strong>{semana.interests}</strong>{' '}
              {semana.interests === 1 ? 'consulta' : 'consultas'}
            </p>
          )}
        </div>

        <Link to="/vender">
          <Button variant="yellow">
            <Icon name="plus" size={16} />
            Publicar vehículo
          </Button>
        </Link>
      </header>

      {loading && <Skeleton height="280px" />}

      {!loading && failed && (
        <EmptyState
          tone="error"
          icon="car"
          title="No pudimos traer tus publicaciones"
          description="Puede ser un problema momentáneo de conexión."
          action={<Button onClick={() => setReloads((count) => count + 1)}>Reintentar</Button>}
        />
      )}

      {mission && <MissionCard mission={mission} />}

      {!loading && !failed && (
        <ListingManager
          listings={listings}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          stats={stats}
        />
      )}
    </div>
  )
}
