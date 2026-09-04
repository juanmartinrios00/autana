import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GarageSlotCard } from '../components/garage/GarageSlotCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getProfile, type ProfileSummary } from '../lib/api'
import { listGarage, removeGarageEntry, saveGarageEntry, SLOTS, type GarageInput } from '../lib/garage'
import { computeLevel } from '../lib/levels'
import { locationLabel, sellerTypeLabels } from '../lib/format'
import type { GarageEntry } from '../types'
import './Profile.css'

/**
 * Sirve para dos cosas: el perfil propio, con el garage editable, y el garage
 * público de cualquiera en `/g/:id`. La única diferencia es si se puede editar.
 */
export function Profile() {
  const { id } = useParams()
  const { session } = useAuth()

  const userId = id ?? session?.user.id ?? ''
  const editable = Boolean(session && session.user.id === userId)

  /* Los datos se guardan junto al usuario que los pidió. Comparar ese id con
     el de la URL es lo que dice si estamos cargando, y de paso evita mostrar
     el garage del perfil anterior al navegar de `/profile` a `/g/otro`. */
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
            <span className="profile__avatar" aria-hidden="true">
              {showing.name.slice(0, 2).toUpperCase()}
            </span>
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
            </div>
          </div>

          {/* El nivel sale de datos reales, no de un contador guardado: si
              borrás una publicación, baja. */}
          <div className="levelcard">
            <div className="levelcard__top">
              <span className="over levelcard__number">Nivel {level.level}</span>
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
        <section className="profile__section">
          <header className="profile__section-head">
            <div>
              <span className="over">El garage</span>
              <h2 className="profile__section-title">Los autos que te marcaron</h2>
            </div>
            {editable && (
              <p className="profile__section-note">
                Es público: podés compartir el link con quien quieras.
              </p>
            )}
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
              </div>
            </header>

            <ul className="achievements">
              {level.achievements.map((item) => (
                <li
                  key={item.id}
                  className={item.done ? 'achievement is-done' : 'achievement'}
                >
                  <span className="achievement__mark" aria-hidden="true">
                    {item.done && <Icon name="check" size={14} />}
                  </span>
                  <div>
                    <h3 className="achievement__title">{item.title}</h3>
                    <p className="achievement__hint">{item.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
