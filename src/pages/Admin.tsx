import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  dismissProfileReports,
  isAdmin,
  listReportedListings,
  listReportedProfiles,
  profileReportReasons,
  reportReasons,
  setListingStatus,
  setProfileContentHidden,
  type ReportedListing,
  type ReportedProfile,
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
  const [profiles, setProfiles] = useState<ReportedProfile[]>([])
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
        if (ok) {
          const [listings, people] = await Promise.all([listReportedListings(), listReportedProfiles()])
          if (!current) return
          setItems(listings)
          setProfiles(people)
        }
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

  /* Lo mismo para perfiles: ocultar o volver a mostrar el contenido, o
     descartar los reportes después de mirarlo y ver que no había nada. */
  async function actOnProfile(id: string, action: () => Promise<void>) {
    setBusy(id)
    setFailure(null)
    try {
      await action()
      setReloads((count) => count + 1)
    } catch (cause) {
      console.error('moderar perfil', cause)
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

      <header className="admin__head admin__head--second">
        <h2 className="admin__title">Garages y perfiles</h2>
        <p className="admin__lead">
          Con tres personas distintas se ocultan solos la foto de perfil, las fotos y las notas
          del garage. El nombre y los avisos siguen. Acá ves las fotos aunque estén ocultas.
        </p>
      </header>

      {profiles.length === 0 ? (
        <EmptyState
          icon="check"
          title="No hay garages reportados"
          description="Cuando alguien reporte un garage o una foto de perfil, va a aparecer acá."
        />
      ) : (
        <ul className="admin__list">
          {profiles.map(({ profile, reports }) => (
            <li className="admin__item" key={profile.id}>
              <div className="admin__item-head">
                <div className="admin__item-person">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="admin__avatar" />
                  ) : (
                    <span className="admin__avatar" aria-hidden="true" />
                  )}
                  <div className="admin__item-titles">
                    <Link to={`/g/${profile.id}`} className="admin__item-title">
                      {profile.name || 'Sin nombre'}
                    </Link>
                    <span className="admin__item-meta mono">
                      {[profile.city, profile.province].filter(Boolean).join(', ') || 'sin ubicación'}
                    </span>
                  </div>
                </div>

                <div className="admin__item-tags">
                  <Badge tone="danger">
                    {reports.length} {reports.length === 1 ? 'reporte' : 'reportes'}
                  </Badge>
                  {profile.contentHidden && <Badge tone="danger">Contenido oculto</Badge>}
                </div>
              </div>

              <ul className="admin__reasons">
                {reports.map((report) => (
                  <li className="admin__reason" key={report.id}>
                    <span className="admin__reason-label">{profileReportReasons[report.reason]}</span>
                    {report.detail && (
                      <span className="admin__reason-detail">“{report.detail}”</span>
                    )}
                    <span className="admin__reason-when">{relativeDate(report.createdAt)}</span>
                  </li>
                ))}
              </ul>

              <div className="admin__actions">
                {profile.contentHidden ? (
                  <Button
                    size="sm"
                    disabled={busy === profile.id}
                    onClick={() => void actOnProfile(profile.id, () => setProfileContentHidden(profile.id, false))}
                  >
                    Volver a mostrar
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === profile.id}
                    onClick={() => void actOnProfile(profile.id, () => setProfileContentHidden(profile.id, true))}
                  >
                    Ocultar contenido
                  </Button>
                )}
                {/* Descartar borra los reportes: el perfil sale de esta lista. Si
                    el contenido estaba oculto, no lo vuelve a mostrar solo; eso
                    es el otro botón, a propósito separado. */}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === profile.id}
                  onClick={() => void actOnProfile(profile.id, () => dismissProfileReports(profile.id))}
                >
                  Descartar reportes
                </Button>
                <Link to={`/g/${profile.id}`}>
                  <Button size="sm" variant="ghost">
                    Ver el garage
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
