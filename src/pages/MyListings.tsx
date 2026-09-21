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
import { deleteListing, listMyListings, setListingStatus } from '../lib/api'
import { listingMission } from '../lib/missions'
import type { ListingStatus, Vehicle } from '../types'
import './MyListings.css'

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
        console.error('listMyListings', cause)
        setFailed(true)
      })
      .finally(() => {
        if (current) setLoadedFor(userId)
      })

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
        />
      )}
    </div>
  )
}
