import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { BRAND, pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  contactSubjects,
  deleteContactMessage,
  dismissProfileReports,
  isAdmin,
  listContactMessages,
  listReportedListings,
  listReportedProfiles,
  profileReportReasons,
  reportReasons,
  setContactHandled,
  setListingStatus,
  setProfileContentHidden,
  type ContactMessage,
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
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)

  useDocumentMeta({ title: pageTitle('Moderación') })

  useEffect(() => {
    if (!userId) return
    let current = true

    void isAdmin()
      .then(async (ok) => {
        if (!current) return
        setAllowed(ok)
        if (ok) {
          /* `allSettled` y no `all`, igual que en el perfil y en el garage. Con
             `all`, un tropiezo de red en cualquiera de las tres listas caia al
             `catch` de abajo, que pone `allowed` en false: a quien modera se le
             decia que no tiene permiso, que es la conclusion mas equivocada
             posible y la que lo manda a buscar el problema donde no esta. Una
             lista que no vino se muestra vacia; las otras dos siguen. */
          const [listings, people, contact] = await Promise.allSettled([
            listReportedListings(),
            listReportedProfiles(),
            listContactMessages(),
          ])
          if (!current) return
          setItems(listings.status === 'fulfilled' ? listings.value : [])
          setProfiles(people.status === 'fulfilled' ? people.value : [])
          setMessages(contact.status === 'fulfilled' ? contact.value : [])

          const caida = [listings, people, contact].find((r) => r.status === 'rejected')
          if (caida) {
            console.error('moderación', caida.reason)
            setFailure('No pudimos traer una de las listas. Recargá para volver a intentarlo.')
          }
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

  /* Lo mismo para todo lo demás que se modera: ocultar el contenido de un
     perfil, descartar sus reportes, marcar un mensaje como respondido. Cambia
     qué se hace, no qué pasa alrededor — bloquear la fila mientras tanto,
     recargar si salió bien, y mostrar el motivo si no. */
  async function actOn(id: string, what: string, action: () => Promise<void>) {
    setBusy(id)
    setFailure(null)
    try {
      await action()
      setReloads((count) => count + 1)
    } catch (cause) {
      console.error(what, cause)
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
                  <Link to={`/autos/${vehicle.slug}`} className="admin__item-title">
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
                <Link to={`/autos/${vehicle.slug}`}>
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
                    onClick={() => void actOn(profile.id, 'mostrar contenido', () => setProfileContentHidden(profile.id, false))}
                  >
                    Volver a mostrar
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === profile.id}
                    onClick={() => void actOn(profile.id, 'ocultar contenido', () => setProfileContentHidden(profile.id, true))}
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
                  onClick={() => void actOn(profile.id, 'descartar reportes', () => dismissProfileReports(profile.id))}
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
      <header className="admin__head admin__head--second">
        <h2 className="admin__title">Mensajes de contacto</h2>
        <p className="admin__lead">
          Lo que llega del formulario de contacto, sin responder primero. Se contesta por correo;
          acá sólo se marca lo que ya está hecho.
        </p>
      </header>

      {messages.length === 0 ? (
        <EmptyState
          icon="check"
          title="No hay mensajes"
          description="Cuando alguien escriba desde la página de contacto, va a aparecer acá."
        />
      ) : (
        <ul className="admin__list">
          {messages.map((message) => (
            <li
              className={`admin__item${message.handled ? ' admin__item--done' : ''}`}
              key={message.id}
            >
              <div className="admin__item-head">
                <div className="admin__item-titles">
                  <span className="admin__item-title">{message.name}</span>
                  <a href={`mailto:${message.email}`} className="admin__item-meta mono">
                    {message.email}
                  </a>
                </div>

                <div className="admin__item-tags">
                  <Badge tone={message.handled ? 'neutral' : 'warning'}>
                    {contactSubjects[message.subject]}
                  </Badge>
                  {/* Con cuenta el mensaje viene atado a ella (019), y saberlo
                      cambia la respuesta: se puede mirar qué publicó antes. */}
                  {message.userId && (
                    <Link to={`/g/${message.userId}`}>
                      <Badge tone="neutral">Tiene cuenta</Badge>
                    </Link>
                  )}
                  {message.handled && <Badge tone="neutral">Respondido</Badge>}
                </div>
              </div>

              <p className="admin__message">{message.message}</p>

              <div className="admin__actions">
                <span className="admin__reason-when">{relativeDate(message.createdAt)}</span>
                <a href={`mailto:${message.email}?subject=${encodeURIComponent(`[${BRAND}] ${contactSubjects[message.subject]}`)}`}>
                  <Button size="sm" variant="ghost">
                    Responder
                  </Button>
                </a>
                <Button
                  size="sm"
                  disabled={busy === message.id}
                  onClick={() =>
                    void actOn(message.id, 'marcar mensaje', () =>
                      setContactHandled(message.id, !message.handled),
                    )
                  }
                >
                  {message.handled ? 'Volver a pendiente' : 'Marcar respondido'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy === message.id}
                  onClick={() =>
                    void actOn(message.id, 'borrar mensaje', () => deleteContactMessage(message.id))
                  }
                >
                  Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
