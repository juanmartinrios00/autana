import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  isAdmin,
  listReportedListings,
  reportReasons,
  setListingStatus,
  type ReportedListing,
} from '../lib/api'
import { describeError } from '../lib/errors'
import { formatPrice, relativeDate, statusLabels, vehicleTitle } from '../lib/format'
import './Admin.css'

/**
 * Moderación: las publicaciones reportadas, ordenadas por cuántas denuncias
 * juntaron.
 *
 * La pantalla no es la que decide quién entra — lo hace la base. Las políticas
 * de `reports` sólo devuelven algo a quien tiene `role = 'admin'`, así que a
 * cualquier otro le llega una lista vacía. Esconder el link no protege nada;
 * lo que protege es que del otro lado no haya datos.
 */
export function Admin() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [items, setItems] = useState<ReportedListing[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)

  useDocumentMeta({ title: 'Moderación | Autana' })

  useEffect(() => {
    if (!userId) return
    let current = true

    void isAdmin()
      .then(async (ok) => {
        if (!current) return
        setAllowed(ok)
        if (ok) setItems(await listReportedListings())
      })
      .catch((cause) => {
        if (!current) return
        console.error('moderación', cause)
        setAllowed(false)
      })
      .finally(() => {
        if (current) setLoadedFor(`${userId}:${reloads}`)
      })

    return () => {
      current = false
    }
  }, [userId, reloads])

  const loading = loadedFor !== `${userId}:${reloads}`

  async function act(id: string, next: 'blocked' | 'active') {
    setBusy(id)
    setFailure(null)
    try {
      await setListingStatus(id, next)
      setReloads((count) => count + 1)
    } catch (cause) {
      console.error('moderar', cause)
      setFailure(describeError(cause, 'No pudimos aplicar el cambio.'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="page section">
        <Skeleton height="320px" />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="close"
          title="Esta pantalla no es para vos"
          description="Sólo las cuentas que moderan pueden ver los reportes."
          action={
            <Link to="/">
              <Button variant="yellow">Ir al inicio</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="page section admin">
      <header className="admin__head">
        <h1 className="admin__title">Moderación</h1>
        <p className="admin__lead">
          Publicaciones reportadas, la más denunciada primero. Con tres personas distintas se
          bloquean solas.
        </p>
      </header>

      {failure && (
        <p className="admin__failure" role="alert">
          {failure}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="check"
          title="No hay nada reportado"
          description="Cuando alguien denuncie una publicación, va a aparecer acá."
        />
      ) : (
        <ul className="admin__list">
          {items.map(({ vehicle, reports }) => (
            <li className="admin__item" key={vehicle.id}>
              <div className="admin__item-head">
                <div className="admin__item-titles">
                  <Link to={`/cars/${vehicle.slug}`} className="admin__item-title">
                    {vehicleTitle(vehicle)}
                  </Link>
                  <span className="admin__item-meta mono">
                    {formatPrice(vehicle.price, vehicle.currency)} · {vehicle.sellerName ?? 'sin nombre'}
                  </span>
                </div>

                <div className="admin__item-tags">
                  <Badge tone="danger">
                    {reports.length} {reports.length === 1 ? 'reporte' : 'reportes'}
                  </Badge>
                  <Badge tone={vehicle.status === 'blocked' ? 'danger' : 'neutral'}>
                    {statusLabels[vehicle.status]}
                  </Badge>
                </div>
              </div>

              <ul className="admin__reasons">
                {reports.map((report) => (
                  <li className="admin__reason" key={report.id}>
                    <span className="admin__reason-label">{reportReasons[report.reason]}</span>
                    {report.detail && (
                      <span className="admin__reason-detail">“{report.detail}”</span>
                    )}
                    <span className="admin__reason-when">{relativeDate(report.createdAt)}</span>
                  </li>
                ))}
              </ul>

              <div className="admin__actions">
                {vehicle.status === 'blocked' ? (
                  <Button
                    size="sm"
                    disabled={busy === vehicle.id}
                    onClick={() => void act(vehicle.id, 'active')}
                  >
                    Desbloquear
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === vehicle.id}
                    onClick={() => void act(vehicle.id, 'blocked')}
                  >
                    Bloquear
                  </Button>
                )}
                <Link to={`/cars/${vehicle.slug}`}>
                  <Button size="sm" variant="ghost">
                    Ver la ficha
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
