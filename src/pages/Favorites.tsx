import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { VehicleGrid } from '../components/vehicle/VehicleGrid'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useFavorites } from '../hooks/useFavorites'
import { getVehiclesByIds } from '../lib/api'
import type { Vehicle } from '../types'
import './Favorites.css'

/**
 * Los autos que guardaste.
 *
 * No exige sesión a propósito: sin cuenta los favoritos viven en el navegador
 * y se ven igual. Pedir registro para mirar lo que uno mismo guardó sería
 * poner un peaje justo donde el visitante todavía está decidiendo.
 */
export function Favorites() {
  const { ids, clear, loading: syncing, failure, synced } = useFavorites()
  const { session } = useAuth()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  /* Para qué lista de ids son los vehículos que hay en memoria. Comparándolo
     con la lista actual sale si estamos esperando, sin un `loading` que haya
     que prender y apagar a mano dentro del efecto. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useDocumentMeta({
    title: 'Favoritos | Autana',
    description: 'Los autos que guardaste en Autana.',
  })

  /* Los ids serializados. El efecto depende de esta cadena y no del array
     —que es una referencia nueva en cada render, y no pararía nunca— y
     adentro la vuelve a partir, así no hay dos fuentes que puedan diferir. */
  const key = ids.join(',')

  useEffect(() => {
    if (syncing) return
    let current = true

    const wanted = key ? key.split(',') : []

    void getVehiclesByIds(wanted)
      .then((found) => {
        if (!current) return
        /* Se respeta el orden en que los guardó, que `in(...)` no garantiza. */
        const byId = new Map(found.map((vehicle) => [vehicle.id, vehicle]))
        setVehicles(wanted.map((id) => byId.get(id)).filter((v): v is Vehicle => Boolean(v)))
      })
      .catch((cause) => {
        if (!current) return
        console.error('getVehiclesByIds', cause)
        setVehicles([])
      })
      .finally(() => {
        if (current) setLoadedKey(key)
      })

    return () => {
      current = false
    }
  }, [key, syncing])

  /* Un favorito puede dejar de estar disponible: si el vendedor lo pausó o lo
     marcó vendido, la política de RLS deja de mostrarlo. Callarlo haría que la
     lista se achique sola sin explicación. */
  const gone = ids.length - vehicles.length
  const busy = syncing || loadedKey !== key

  return (
    <div className="page section favorites">
      <header className="favorites__head">
        <div className="favorites__titles">
          <h1 className="favorites__title">Favoritos</h1>
          {!busy && ids.length > 0 && (
            <p className="favorites__count">
              {vehicles.length} {vehicles.length === 1 ? 'auto guardado' : 'autos guardados'}
              {gone > 0 && ` · ${gone} ya no ${gone === 1 ? 'está disponible' : 'están disponibles'}`}
            </p>
          )}
        </div>

        {!busy && ids.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Vaciar la lista
          </Button>
        )}
      </header>

      {failure && (
        <p className="favorites__failure" role="alert">
          {failure}
        </p>
      )}

      {/* Sin cuenta la lista vive en este navegador y se pierde al cambiar de
          teléfono. Conviene decirlo acá, que es donde importa, y no en un
          cartel genérico en otro lado. */}
      {!session && ids.length > 0 && (
        <div className="favorites__notice">
          <Icon name="heart" size={17} />
          <p className="favorites__notice-text">
            Estos favoritos están guardados sólo en este navegador. Si entrás a tu cuenta se
            suben y los vas a tener en cualquier dispositivo.
          </p>
          <Link to="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      )}

      {busy && <VehicleGrid vehicles={[]} loading skeletonCount={3} />}

      {!busy && ids.length === 0 && (
        <EmptyState
          icon="heart"
          title="Todavía no guardaste ningún auto"
          description="Tocá el corazón en cualquier publicación y lo vas a encontrar acá."
          action={
            <Link to="/cars">
              <Button variant="yellow">Ver los autos publicados</Button>
            </Link>
          }
        />
      )}

      {!busy && ids.length > 0 && vehicles.length === 0 && (
        <EmptyState
          icon="heart"
          title="Tus favoritos ya no están disponibles"
          description="Los vendedores los pausaron o los marcaron vendidos."
          action={
            <Link to="/cars">
              <Button variant="yellow">Buscar otros</Button>
            </Link>
          }
        />
      )}

      {!busy && vehicles.length > 0 && (
        <>
          <VehicleGrid vehicles={vehicles} />
          {synced && (
            <p className="favorites__synced">
              <Icon name="check" size={15} />
              Guardados en tu cuenta.
            </p>
          )}
        </>
      )}
    </div>
  )
}
