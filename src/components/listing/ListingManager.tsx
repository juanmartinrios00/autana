import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { describeError } from '../../lib/errors'
import { formatPrice, statusLabels, vehicleTitle } from '../../lib/format'
import type { ListingStatus, Vehicle } from '../../types'
import './ListingManager.css'

/**
 * La lista de avisos propios con sus acciones. Se llama por el trabajo que
 * hace —gestionar— para no chocar con la página `MyListings` que la usa.
 *
 * No hace fetch: los datos y las acciones entran por props desde `Profile`,
 * igual que en el garage. Acá vive nada más el estado de la interacción —cuál
 * fila está ocupada y cuál está pidiendo confirmación para borrar.
 */

const statusTone: Record<ListingStatus, 'success' | 'warning' | 'dark' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  sold: 'dark',
  draft: 'neutral',
}

interface ListingManagerProps {
  listings: Vehicle[]
  onStatusChange: (id: string, status: ListingStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ListingManager({ listings, onStatusChange, onDelete }: ListingManagerProps) {
  /* El id del aviso que está esperando una respuesta del servidor, para
     bloquear sus botones sin congelar los de las otras filas. */
  const [busy, setBusy] = useState<string | null>(null)
  /* Borrar no tiene vuelta atrás, así que pide confirmación en la misma fila:
     un `confirm()` del navegador se saltea sin leerlo. */
  const [confirming, setConfirming] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  async function run(id: string, action: () => Promise<void>, fallback: string) {
    setBusy(id)
    setFailure(null)
    try {
      await action()
    } catch (cause) {
      console.error(fallback, cause)
      setFailure(describeError(cause, fallback))
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  if (listings.length === 0) {
    return (
      <div className="mylistings__empty">
        <p className="mylistings__empty-text">Todavía no publicaste ningún auto.</p>
        <Link to="/sell">
          <Button variant="yellow">Publicar mi vehículo</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mylistings">
      {failure && (
        <p className="mylistings__failure" role="alert">
          {failure}
        </p>
      )}

      <ul className="mylistings__list">
        {listings.map((vehicle) => {
          const cover = vehicle.images[0]
          const isBusy = busy === vehicle.id
          const isConfirming = confirming === vehicle.id
          const title = vehicleTitle(vehicle)

          return (
            <li
              key={vehicle.id}
              className={vehicle.status === 'active' ? 'mylisting' : 'mylisting is-quiet'}
            >
              <div className="mylisting__media">
                {cover ? (
                  <img src={cover.url} alt="" loading="lazy" className="mylisting__img" />
                ) : (
                  <span className="mylisting__img-empty" aria-hidden="true">
                    <Icon name="car" size={20} />
                  </span>
                )}
              </div>

              <div className="mylisting__body">
                <div className="mylisting__head">
                  {/* El link va al aviso público. Si está pausado o vendido lo
                      ve sólo el dueño: la política de RLS ya lo esconde. */}
                  <Link to={`/cars/${vehicle.slug}`} className="mylisting__title">
                    {title}
                  </Link>
                  <Badge tone={statusTone[vehicle.status]}>{statusLabels[vehicle.status]}</Badge>
                </div>

                <p className="mylisting__meta mono">
                  {formatPrice(vehicle.price, vehicle.currency)} · {vehicle.year} ·{' '}
                  {vehicle.images.length}{' '}
                  {vehicle.images.length === 1 ? 'foto' : 'fotos'} · {vehicle.viewCount}{' '}
                  {vehicle.viewCount === 1 ? 'visita' : 'visitas'}
                </p>

                {isConfirming ? (
                  <div className="mylisting__actions mylisting__actions--confirm">
                    <span className="mylisting__confirm-text">
                      Se borra el aviso y sus fotos. No se puede deshacer.
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        void run(vehicle.id, () => onDelete(vehicle.id), 'No pudimos borrar el aviso.')
                      }
                    >
                      {isBusy ? 'Borrando…' : 'Sí, eliminar'}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => setConfirming(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="mylisting__actions">
                    {vehicle.status === 'active' ? (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          void run(
                            vehicle.id,
                            () => onStatusChange(vehicle.id, 'paused'),
                            'No pudimos pausar el aviso.',
                          )
                        }
                      >
                        Pausar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          void run(
                            vehicle.id,
                            () => onStatusChange(vehicle.id, 'active'),
                            'No pudimos reactivar el aviso.',
                          )
                        }
                      >
                        {vehicle.status === 'sold' ? 'Volver a publicar' : 'Reactivar'}
                      </Button>
                    )}

                    {vehicle.status !== 'sold' && (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          void run(
                            vehicle.id,
                            () => onStatusChange(vehicle.id, 'sold'),
                            'No pudimos marcarlo como vendido.',
                          )
                        }
                      >
                        Marcar vendido
                      </Button>
                    )}

                    <Link to={`/sell/${vehicle.slug}/edit`} className="mylisting__edit">
                      <Button size="sm" disabled={isBusy}>
                        Editar
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setConfirming(vehicle.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
