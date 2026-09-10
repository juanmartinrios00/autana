import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GarageSlotCard } from '../components/garage/GarageSlotCard'
import { GarageSketchDefs } from '../components/garage/scenes'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getProfile, type ProfileSummary } from '../lib/api'
import { listGarage, removeGarageEntry, saveGarageEntry, SLOTS, type GarageInput } from '../lib/garage'
import type { GarageEntry } from '../types'
import './Garage.css'

/**
 * El garage, en pantalla propia.
 *
 * Antes `/g/:id` renderizaba el perfil entero. El título del documento ya
 * decía "El garage de X" y la copy ya prometía que se comparte por link, así
 * que la pantalla estaba implícita; esto la hace explícita.
 *
 * Por qué separarla del perfil: son dos cosas con dos públicos. El perfil es
 * el panel de alguien que vende — sus publicaciones, sus logros, su foto. El
 * garage es lo que esa persona manda a un grupo de WhatsApp. Si el link
 * abriera el panel, lo primero que se ve al compartirlo son botones que el que
 * abre no puede tocar.
 */
export function Garage() {
  const { id } = useParams()
  const { session } = useAuth()

  const userId = id ?? session?.user.id ?? ''
  const editable = Boolean(session && session.user.id === userId)

  /* Igual que en el perfil: se guarda de quién son los datos cargados, para no
     mostrar el garage anterior mientras llega el nuevo al cambiar de link. */
  const [loaded, setLoaded] = useState<{
    userId: string
    profile: ProfileSummary | null
    garage: GarageEntry[]
    failed: boolean
  }>({ userId: '', profile: null, garage: [], failed: false })

  const [reloads, setReloads] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!userId) return
    let current = true

    /* `allSettled` y no `all`: si falla el perfil pero llega el garage, se
       muestran los autos igual. Es lo que la gente vino a ver. */
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
  const profile = fresh ? loaded.profile : null
  const garage = fresh ? loaded.garage : []
  const filled = garage.length

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

  return (
    <>
      {/* El filtro que le da el temblor al trazo. Una sola vez por página: las
          cuatro escenas lo referencian por id. */}
      <GarageSketchDefs />

      <section className="garagepage__head">
        <div className="page garagepage__head-inner">
          <span className="over over--invert">El garage</span>
          <h1 className="garagepage__title">
            {editable ? 'Los autos que te marcaron' : `Los autos que marcaron a ${profile.name}`}
          </h1>
          <p className="garagepage__lead">
            No son los que vende. Son el primero, el de hoy, el que sueña y el que no
            tendría que haber vendido.
          </p>

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
                Volver a mi perfil
              </Link>
            )}
          </div>
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
              onSave={handleSave}
              onRemove={() => handleRemove(slot.id)}
            />
          ))}
        </div>

        {!editable && (
          <p className="garagepage__cta">
            <Link to="/profile">Armá el tuyo</Link> y compartilo.
          </p>
        )}
      </div>
    </>
  )
}
