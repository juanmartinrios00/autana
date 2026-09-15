import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FollowControls } from '../components/garage/FollowControls'
import { GarageSlotCard } from '../components/garage/GarageSlotCard'
import { GarageThemePicker } from '../components/garage/GarageThemePicker'
import { ProfileContact } from '../components/garage/ProfileContact'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { ReportDialog } from '../components/vehicle/ReportDialog'
import { VehicleGrid } from '../components/vehicle/VehicleGrid'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getProfile, listSellerVehicles, type ProfileSummary } from '../lib/api'
import { listGarage, removeGarageEntry, saveGarageEntry, SLOTS, type GarageInput } from '../lib/garage'
import { garageThemeColor } from '../lib/garage-theme'
import type { GarageEntry, Vehicle } from '../types'
import './Garage.css'

/**
 * El garage, en pantalla propia. Es el perfil público de cada persona.
 *
 * Antes `/g/:id` renderizaba el perfil entero. El título del documento ya
 * decía "El garage de X" y la copy ya prometía que se comparte por link, así
 * que la pantalla estaba implícita; esto la hace explícita.
 *
 * Por qué separarla del panel propio (`/profile`): son dos cosas con dos
 * públicos. El panel es donde uno administra lo suyo. El garage es lo que esa
 * persona manda a un grupo de WhatsApp, y lo que ve quien llega desde un aviso:
 * quién es, qué autos la marcaron, y qué tiene a la venta.
 */
export function Garage() {
  const { id } = useParams()
  const { session } = useAuth()
  const location = useLocation()

  const userId = id ?? session?.user.id ?? ''
  const editable = Boolean(session && session.user.id === userId)

  /* Igual que en el perfil: se guarda de quién son los datos cargados, para no
     mostrar el garage anterior mientras llega el nuevo al cambiar de link. */
  const [loaded, setLoaded] = useState<{
    userId: string
    profile: ProfileSummary | null
    garage: GarageEntry[]
    listings: Vehicle[]
    failed: boolean
  }>({ userId: '', profile: null, garage: [], listings: [], failed: false })

  const [reloads, setReloads] = useState(0)
  const [copied, setCopied] = useState(false)
  /* El tema elegido recién, antes de que vuelva a cargar el perfil. */
  const [theme, setTheme] = useState<{ userId: string; id: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    let current = true

    /* `allSettled` y no `all`: si falla el perfil pero llega el garage, se
       muestran los autos igual. Es lo que la gente vino a ver. Y si fallan los
       avisos, el garage no se esconde por eso. */
    void Promise.allSettled([getProfile(userId), listGarage(userId), listSellerVehicles(userId)]).then(
      ([profileResult, garageResult, listingsResult]) => {
        if (!current) return
        setLoaded({
          userId,
          profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
          garage: garageResult.status === 'fulfilled' ? garageResult.value : [],
          listings: listingsResult.status === 'fulfilled' ? listingsResult.value : [],
          failed: profileResult.status === 'rejected',
        })
      },
    )

    return () => {
      current = false
    }
  }, [userId, reloads])

  const fresh = loaded.userId === userId
  const profile = fresh ? loaded.profile : null
  const garage = fresh ? loaded.garage : []
  const listings = fresh ? loaded.listings : []
  const filled = garage.length

  /* "Ver publicaciones" desde la ficha de un aviso trae `#avisos`. React Router
     no baja solo a un ancla, y además la sección no existe hasta que llegan
     los avisos: se baja cuando están. */
  const hasListings = listings.length > 0
  useEffect(() => {
    if (location.hash !== '#avisos' || !hasListings) return
    document.getElementById('avisos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, hasListings])

  useDocumentMeta({
    title: profile ? `El garage de ${profile.name} | Autana` : 'Garage | Autana',
    description: profile
      ? `Los autos que marcaron a ${profile.name}: el primero, el de hoy, el soñado y el que más extraña.`
      : undefined,
  })

  async function handleSave(input: GarageInput, photo?: File) {
    await saveGarageEntry(userId, input, photo)
    setReloads((count) => count + 1)
  }

  async function handleRemove(slot: GarageInput['slot']) {
    await removeGarageEntry(userId, slot)
    setReloads((count) => count + 1)
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Sin portapapeles —permiso denegado, contexto inseguro— no hay nada que
         avisar: el link está en la barra de direcciones, que es de donde lo
         iba a sacar igual. */
    }
  }

  if (fresh && loaded.failed) {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="No encontramos ese garage"
          description="Puede que la cuenta ya no exista."
          action={
            <Link to="/cars">
              <Button variant="yellow">Ver el marketplace</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page section">
        <Skeleton height="180px" />
      </div>
    )
  }

  const themeId = theme?.userId === userId ? theme.id : profile.garageTheme
  /* Ocultas por moderación: la foto de perfil, las fotos y las notas del garage.
     Se oculta también para el dueño, así ve lo mismo que el resto y entiende el
     aviso de abajo. */
  const hidden = profile.contentHidden
  const place = [profile.city, profile.province].filter(Boolean)
  const placeLabel = place[0] === place[1] ? place[0] : place.join(', ')

  return (
    <>
      <section
        className="garagepage__head"
        style={{ '--garage-bg': garageThemeColor(themeId) } as CSSProperties}
      >
        <div className="page garagepage__head-inner">
          {/* Quién es, antes que nada. Quien llega desde un aviso o desde el
              buscador tiene que reconocer a la persona de un vistazo. */}
          <div className="garagepage__who">
            {profile.avatarUrl && !hidden ? (
              <img src={profile.avatarUrl} alt="" className="garagepage__avatar" />
            ) : (
              <span className="garagepage__avatar garagepage__avatar--empty" aria-hidden="true">
                {initials(profile.name)}
              </span>
            )}
            <div className="garagepage__who-text">
              <span className="garagepage__name">
                {profile.name}
                {profile.verified && (
                  <Badge tone="success" className="garagepage__verified">
                    Verificada
                  </Badge>
                )}
              </span>
              {placeLabel && <span className="garagepage__place">{placeLabel}</span>}
            </div>
          </div>

          <span className="over over--invert garagepage__over">El garage</span>
          <h1 className="garagepage__title">
            {editable ? 'Los autos que te marcaron' : `Los autos que marcaron a ${profile.name}`}
          </h1>
          <p className="garagepage__lead">
            No son los que vende. Son el primero, el de hoy, el que sueña y el que no
            tendría que haber vendido.
          </p>

          {hidden && (
            <p className="garagepage__hidden" role="status">
              {editable
                ? 'Tus fotos y notas están ocultas porque recibieron reportes. Las estamos revisando; mientras tanto el resto de tu garage se ve igual.'
                : 'Algunas fotos y notas de este garage están ocultas mientras se revisan.'}
            </p>
          )}

          <div className="garagepage__actions">
            <span className="garagepage__count mono">
              {filled} de {SLOTS.length}
            </span>
            <Button variant="outline" size="sm" onClick={() => void share()}>
              <Icon name="link" size={14} />
              {copied ? 'Link copiado' : 'Compartir'}
            </Button>
            {editable && (
              <Link to="/profile" className="garagepage__back">
                {profile.avatarUrl ? 'Volver a mi perfil' : 'Subí tu foto desde tu perfil'}
              </Link>
            )}
          </div>

          <FollowControls targetId={userId} targetName={profile.name} />
          <ProfileContact targetId={userId} instagram={profile.instagram} />

          {editable && (
            <GarageThemePicker
              userId={userId}
              value={themeId}
              onChange={(next) => setTheme({ userId, id: next })}
            />
          )}
        </div>
      </section>

      <div className="page garagepage__body">
        <div className="garage">
          {SLOTS.map((slot) => (
            <GarageSlotCard
              key={slot.id}
              slot={slot.id}
              entry={garage.find((entry) => entry.slot === slot.id)}
              editable={editable}
              hideMedia={hidden}
              onSave={handleSave}
              onRemove={() => handleRemove(slot.id)}
            />
          ))}
        </div>

        {/* Los autos que vende, separados de los que la marcaron. Van después y
            no antes: el garage es lo que distingue esta pantalla de un listado,
            y quien vino a ver avisos tiene el ancla desde la ficha. */}
        {hasListings && (
          <section className="garagepage__listings" id="avisos" aria-labelledby="avisos-title">
            <span className="over">A la venta</span>
            <h2 className="garagepage__listings-title" id="avisos-title">
              {editable
                ? 'Tus avisos publicados'
                : `${listings.length === 1 ? 'El auto' : 'Los autos'} que publica ${profile.name}`}
            </h2>
            <VehicleGrid vehicles={listings} />
          </section>
        )}

        {!editable && (
          <p className="garagepage__cta">
            <Link to="/garage/mio">Armá el tuyo</Link> y compartilo.
          </p>
        )}

        {/* Al final y en voz baja, igual que en la ficha de un aviso: tiene que
            estar a mano para quien lo necesita, sin ser lo que se ve primero. */}
        {!editable && (
          <div className="garagepage__report">
            <ReportDialog kind="profile" targetId={userId} title={profile.name} />
          </div>
        )}
      </div>
    </>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
