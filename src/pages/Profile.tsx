import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GarageSlotCard } from '../components/garage/GarageSlotCard'
import { AchievementList } from '../components/levels/AchievementList'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  type ProfileSummary,
} from '../lib/api'
import { listGarage, removeGarageEntry, saveGarageEntry, SLOTS, type GarageInput } from '../lib/garage'
import { computeLevel } from '../lib/levels'
import { locationLabel, sellerTypeLabels } from '../lib/format'
import type { GarageEntry } from '../types'
import './Profile.css'

/**
 * El perfil propio: la foto, el nivel, la puerta al panel de venta y el garage
 * editable.
 *
 * Hasta hace poco esta misma pantalla servía también el garage público de otra
 * persona en `/g/:id`, y por eso tenía todo duplicado en dos modos. Ese caso
 * se fue a `Garage`, que es una pantalla pensada para que la abra alguien que
 * no puede tocar nada. Acá `editable` es siempre verdadero: la ruta vive detrás
 * de `RequireAuth`.
 */
export function Profile() {
  const { session } = useAuth()

  const userId = session?.user.id ?? ''
  const editable = true

  /* Los datos se guardan junto al usuario que los pidió, y comparar ese id con
     el actual es lo que dice si todavía estamos cargando. */
  const [loaded, setLoaded] = useState<{
    userId: string
    profile: ProfileSummary | null
    garage: GarageEntry[]
    failed: boolean
  }>({ userId: '', profile: null, garage: [], failed: false })

  /* Se incrementa después de guardar o quitar un auto, para volver a pedir
     todo: el nivel depende del garage, así que no alcanza con actualizar la
     lista por su cuenta. */
  const [reloads, setReloads] = useState(0)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [typeBusy, setTypeBusy] = useState(false)
  const [typeError, setTypeError] = useState('')

  useEffect(() => {
    if (!userId) return
    let current = true

    /* `allSettled` y no `all`: si se cae el garage, el perfil se muestra igual
       con los espacios vacíos. Un fallo parcial no puede esconder la página. */
    void Promise.allSettled([getProfile(userId), listGarage(userId)]).then(
      ([profileResult, garageResult]) => {
        if (!current) return

        setLoaded({
          userId,
          profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
          garage: garageResult.status === 'fulfilled' ? garageResult.value : [],
          failed: profileResult.status === 'rejected',
        })
      },
    )

    return () => {
      current = false
    }
  }, [userId, reloads])

  const fresh = loaded.userId === userId
  const showing = fresh ? loaded.profile : null
  const garage = fresh ? loaded.garage : []
  const status = !fresh ? 'loading' : loaded.failed ? 'notfound' : 'ready'

  const level = computeLevel({
    profile: showing
      ? { name: showing.name, whatsapp: showing.whatsapp, city: showing.city }
      : null,
    activeListings: showing?.activeListings ?? 0,
    bestPhotoCount: showing?.bestPhotoCount ?? 0,
    garageCars: garage.length,
  })

  useDocumentMeta({
    title: showing ? `El garage de ${showing.name} | Autana` : 'Perfil | Autana',
    description: showing
      ? `Los autos que marcaron a ${showing.name}: el primero, el actual y el soñado.`
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

  async function handleAvatar(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Elegí una imagen JPG, PNG o WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('La foto puede pesar hasta 5 MB.')
      return
    }

    setAvatarBusy(true)
    setAvatarError('')
    try {
      const avatarUrl = await uploadProfileAvatar(userId, file)
      setLoaded((current) => ({
        ...current,
        profile: current.profile ? { ...current.profile, avatarUrl } : current.profile,
      }))
    } catch {
      setAvatarError('No pudimos guardar la foto. Probá de nuevo.')
    } finally {
      setAvatarBusy(false)
    }
  }


  /* El tipo de vendedor es lo unico del perfil que no se completa publicando:
     `/sell` guarda WhatsApp, ciudad y provincia, pero nunca toca esto. Sin este
     control nadie podia declararse concesionaria, y por eso el slider de la
     home y el filtro por concesionaria estaban vacios desde siempre. */
  async function handleType(value: string) {
    if (!showing || value === showing.sellerType) return

    setTypeBusy(true)
    setTypeError('')
    try {
      await updateProfile(userId, {
        name: showing.name,
        whatsapp: showing.whatsapp ?? '',
        city: showing.city ?? '',
        province: showing.province ?? '',
        sellerType: value as ProfileSummary['sellerType'],
      })
      setReloads((count) => count + 1)
    } catch {
      setTypeError('No pudimos guardar el cambio. Probá de nuevo.')
    } finally {
      setTypeBusy(false)
    }
  }

  if (status === 'notfound') {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="No encontramos ese perfil"
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

  if (!showing) {
    return (
      <div className="page section">
        <Skeleton height="180px" />
      </div>
    )
  }

  return (
    <>
      <section className="profile__head">
        <div className="page profile__head-inner">
          <div className="profile__identity">
            <div className="profile__avatar-shell">
              <span className="profile__avatar" aria-hidden="true">
                {showing.avatarUrl ? (
                  <img src={showing.avatarUrl} alt="" className="profile__avatar-img" />
                ) : (
                  <Icon name="user" size={34} />
                )}
              </span>
              {editable && (
                <label className="profile__avatar-action" title="Cambiar foto de perfil">
                  <Icon name="camera" size={15} />
                  <span className="sr-only">Cargar foto de perfil</span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={avatarBusy}
                    onChange={(event) => {
                      void handleAvatar(event.target.files?.[0])
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <div>
              <h1 className="profile__name">{showing.name}</h1>
              <div className="profile__meta">
                <Badge tone="dark">{sellerTypeLabels[showing.sellerType]}</Badge>
                {showing.city && (
                  <span>
                    {locationLabel({ city: showing.city, province: showing.province ?? '' })}
                  </span>
                )}
                <span className="mono">
                  {showing.activeListings}{' '}
                  {showing.activeListings === 1 ? 'publicación' : 'publicaciones'}
                </span>
              </div>
              {editable && (
                <p className={avatarError ? 'profile__avatar-status is-error' : 'profile__avatar-status'}>
                  {avatarBusy ? 'Guardando foto…' : avatarError || 'Podés cambiar tu foto desde el ícono.'}
                </p>
              )}
            </div>
          </div>

          {/* El nivel sale de datos reales, no de un contador guardado: si
              borrás una publicación, baja.

              Vive acá y en ningún otro lado. Estuvo un tiempo al lado del
              precio en cada aviso, y ahí engañaba: se gana en parte cargando
              autos en el garage, que es nostalgia, y un comprador lo leía como
              una medida de con quién es seguro encontrarse. Al comprador le
              van hechos ahora — ver `src/lib/trust.ts`. */}
          <div className="levelcard">
            <div className="levelcard__top">
              <span className="over over--invert levelcard__number">Nivel {level.level}</span>
              <span className="levelcard__title">{level.title}</span>
            </div>

            <div className="levelcard__bar" aria-hidden="true">
              <span
                className="levelcard__fill"
                style={{ width: `${Math.round(level.progress * 100)}%` }}
              />
            </div>

            <p className="levelcard__hint">
              {level.toNext === null
                ? `${level.earned} de ${level.achievements.length} logros. Llegaste al último nivel.`
                : `${level.toNext} ${level.toNext === 1 ? 'logro más' : 'logros más'} para ${level.nextTitle}.`}
            </p>
          </div>
        </div>
      </section>

      <div className="page profile__body">
        {/* La puerta al panel de venta. Va arriba de todo y como bloque
            entero, no como un link perdido: es lo que más viene a hacer
            alguien que entra a su propio perfil. */}
        {editable && (
          <Link to="/my-listings" className="profile__listings">
            <span className="profile__listings-copy">
              <span className="over">Tus avisos</span>
              <span className="profile__listings-title">Mis publicaciones</span>
              <span className="profile__listings-text">
                {showing.activeListings === 0
                  ? 'Todavía no tenés avisos activos. Entrá para publicar el primero.'
                  : `${showing.activeListings} ${
                      showing.activeListings === 1 ? 'aviso activo' : 'avisos activos'
                    }. Pausalos, editalos o marcalos vendidos.`}
              </span>
            </span>
            <span className="profile__listings-arrow" aria-hidden="true">
              <Icon name="arrowRight" size={20} />
            </span>
          </Link>
        )}

        <section className="profile__section">
          <header className="profile__section-head">
            <div>
              <span className="over">Cómo vendés</span>
              <h2 className="profile__section-title">Tipo de vendedor</h2>
              <p className="profile__section-note">
                Aparece en cada uno de tus avisos y define el tope de publicaciones
                activas: 5 para particulares, 25 para concesionarias.{' '}
                <Link to="/dealers">Qué cambia si sos concesionaria</Link>.
              </p>
            </div>
          </header>

          <div className="profile__seller-type">
            <Select
              label="Publico como"
              hideLabel
              options={[
                { value: 'private', label: 'Particular' },
                { value: 'dealer', label: 'Concesionaria' },
              ]}
              value={showing.sellerType}
              disabled={typeBusy}
              error={typeError || undefined}
              onChange={(event) => void handleType(event.target.value)}
            />
            {typeBusy && <span className="profile__section-note">Guardando…</span>}
          </div>
        </section>

        <section className="profile__section">
          <header className="profile__section-head">
            <div>
              <span className="over">El garage</span>
              <h2 className="profile__section-title">Los autos que te marcaron</h2>
            </div>
            <p className="profile__section-note">
              Es público y tiene pantalla propia:{' '}
              <Link to={`/g/${userId}`}>vela como la ve el resto</Link> y compartila.
            </p>
          </header>

          <div className="garage">
            {SLOTS.map((slot) => (
              <GarageSlotCard
                key={slot.id}
                slot={slot.id}
                entry={garage.find((entry) => entry.slot === slot.id)}
                editable={editable}
                onSave={handleSave}
                onRemove={() => handleRemove(slot.id)}
              />
            ))}
          </div>
        </section>

        {editable && (
          <section className="profile__section">
            <header className="profile__section-head">
              <div>
                <span className="over">Progreso</span>
                <h2 className="profile__section-title">Logros</h2>
                <p className="profile__section-note">
                  Es un juego del perfil, no una calificación de vendedor. A quien
                  mira tus autos le mostramos hechos: si estás verificada y desde
                  cuándo tenés cuenta.{' '}
                  <Link to="/levels">Cómo funcionan los niveles</Link>.
                </p>
              </div>
            </header>

            <AchievementList achievements={level.achievements} />
          </section>
        )}
      </div>
    </>
  )
}
