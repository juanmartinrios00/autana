import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhotoUploader, type Photo } from '../components/sell/PhotoUploader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { provinces } from '../data/makes'
import { useAuth } from '../hooks/useAuth'
import { useListingDraft, type ListingDraft } from '../hooks/useListingDraft'
import { createListing } from '../lib/api'
import { describeError } from '../lib/errors'
import {
  bodyLabels,
  conditionLabels,
  drivetrainLabels,
  formatPrice,
  fuelLabels,
  transmissionLabels,
} from '../lib/format'
import './Sell.css'

const steps = ['Vehículo', 'Detalles', 'Fotos', 'Precio y contacto'] as const

/** Devuelve el mensaje de error por campo, o `null` si el paso está completo. */
function validate(step: number, draft: ListingDraft): Partial<Record<keyof ListingDraft, string>> {
  const errors: Partial<Record<keyof ListingDraft, string>> = {}
  const year = Number(draft.year)
  const thisYear = new Date().getFullYear()

  if (step === 0) {
    if (!draft.make.trim()) errors.make = 'Falta la marca.'
    if (!draft.model.trim()) errors.model = 'Falta el modelo.'
    if (!draft.year) errors.year = 'Falta el año.'
    else if (year < 1950 || year > thisYear + 1) errors.year = `Poné un año entre 1950 y ${thisYear + 1}.`
    if (!draft.condition) errors.condition = 'Elegí la condición.'
  }

  if (step === 1) {
    if (draft.mileage === '') errors.mileage = 'Falta el kilometraje.'
    else if (Number(draft.mileage) < 0 || Number(draft.mileage) > 1_000_000)
      errors.mileage = 'Ese kilometraje no parece real.'
    if (!draft.fuelType) errors.fuelType = 'Elegí el combustible.'
    if (!draft.transmission) errors.transmission = 'Elegí la transmisión.'
    if (!draft.bodyType) errors.bodyType = 'Elegí la carrocería.'
  }

  if (step === 3) {
    const price = Number(draft.price)
    if (!draft.price) errors.price = 'Falta el precio.'
    else if (price < 500 || price > 5_000_000) errors.price = 'Poné un precio en dólares realista.'
    if (!draft.province) errors.province = 'Elegí la provincia.'
    if (!draft.city.trim()) errors.city = 'Falta la ciudad o el barrio.'
    if (!/^\+?\d[\d\s-]{7,}$/.test(draft.whatsapp)) errors.whatsapp = 'Poné un WhatsApp válido con característica.'
  }

  return errors
}

function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}

export function Sell() {
  const { draft, update, reset, savedAt } = useListingDraft()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof ListingDraft, string>>>({})
  const [publishing, setPublishing] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)

  function goNext() {
    const found = validate(step, draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setStep((current) => Math.min(current + 1, steps.length - 1))
    window.scrollTo({ top: 0 })
  }

  function goBack() {
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
    window.scrollTo({ top: 0 })
  }

  async function publish() {
    const found = validate(3, draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (!session) return

    setPublishing(true)
    setFailure(null)

    try {
      const vehicle = await createListing(
        {
          make: draft.make.trim(),
          model: draft.model.trim(),
          trim: draft.trim.trim() || null,
          year: Number(draft.year),
          price: Number(draft.price),
          negotiable: draft.negotiable,
          mileage: Number(draft.mileage),
          condition: draft.condition as Exclude<ListingDraft['condition'], ''>,
          fuelType: draft.fuelType as Exclude<ListingDraft['fuelType'], ''>,
          transmission: draft.transmission as Exclude<ListingDraft['transmission'], ''>,
          drivetrain: draft.drivetrain || null,
          bodyType: draft.bodyType as Exclude<ListingDraft['bodyType'], ''>,
          engine: draft.engine.trim() || null,
          doors: draft.doors ? Number(draft.doors) : null,
          color: draft.color.trim() || null,
          city: draft.city.trim(),
          province: draft.province,
          description: draft.description.trim(),
          whatsapp: draft.whatsapp.trim(),
        },
        photos.map((photo) => photo.blob),
        session.user.id,
      )

      setPublishedSlug(vehicle.slug)
      window.scrollTo({ top: 0 })
    } catch (cause) {
      console.error('createListing', cause)
      setFailure(describeError(cause, 'No pudimos publicar el aviso. Probá de nuevo en un momento.'))
    } finally {
      setPublishing(false)
    }
  }

  if (publishedSlug) {
    return (
      <div className="page section sell__done">
        <div className="card card--pad sell__done-card">
          <span className="sell__done-icon">
            <Icon name="check" size={28} />
          </span>
          <h1>Tu publicación está lista</h1>
          <p className="sell__done-text">
            {draft.make} {draft.model} {draft.year} · {formatPrice(Number(draft.price))}
          </p>
          <p className="sell__done-note">
            Ya es visible para cualquiera que entre al marketplace.
          </p>
          <div className="sell__done-actions">
            <Button variant="yellow" onClick={() => navigate(`/cars/${publishedSlug}`)}>
              Ver mi publicación
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                reset()
                setPhotos([])
                setStep(0)
                setPublishedSlug(null)
              }}
            >
              Publicar otro
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page sell">
      <ol className="stepper">
        {steps.map((label, index) => (
          <li className="stepper__item" key={label}>
            <span
              className={
                index < step
                  ? 'stepper__dot is-done'
                  : index === step
                    ? 'stepper__dot is-on'
                    : 'stepper__dot'
              }
            >
              {index < step ? <Icon name="check" size={15} /> : <span className="mono">{index + 1}</span>}
            </span>
            <span className={index === step ? 'stepper__label is-on' : 'stepper__label'}>
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className={index < step ? 'stepper__line is-done' : 'stepper__line'} />
            )}
          </li>
        ))}
      </ol>

      <div className="sell__body">
        <div className="sell__form">
          <header className="sell__head">
            <span className="over">
              Paso {step + 1} de {steps.length}
            </span>
            <h1 className="sell__title">
              {step === 0 && 'Contanos qué auto vendés'}
              {step === 1 && 'Los datos del vehículo'}
              {step === 2 && 'Subí las fotos'}
              {step === 3 && 'Precio, ubicación y contacto'}
            </h1>
            <p className="sell__lead">
              {step === 0 && 'Con la marca, el modelo y el año alcanza para empezar.'}
              {step === 1 && 'Cuanto más completo, más consultas vas a recibir.'}
              {step === 2 &&
                'Las publicaciones con 8 fotos o más reciben el triple de consultas. La primera es la que se ve en los resultados.'}
              {step === 3 && 'El comprador te va a escribir por WhatsApp con un mensaje ya armado.'}
            </p>
          </header>

          {step === 0 && (
            <div className="sell__fields">
              <div className="sell__pair">
                <Input
                  label="Marca"
                  placeholder="Ej. Renault"
                  value={draft.make}
                  error={errors.make}
                  onChange={(event) => update('make', event.target.value)}
                />
                <Input
                  label="Modelo"
                  placeholder="Ej. Symbol"
                  value={draft.model}
                  error={errors.model}
                  onChange={(event) => update('model', event.target.value)}
                />
              </div>
              <div className="sell__pair">
                <Input
                  label="Versión (opcional)"
                  placeholder="Ej. Luxe 1.6"
                  value={draft.trim}
                  onChange={(event) => update('trim', event.target.value)}
                />
                <Input
                  label="Año"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej. 2018"
                  value={draft.year}
                  error={errors.year}
                  onChange={(event) => update('year', event.target.value)}
                />
              </div>
              <Select
                label="Condición"
                placeholder="Elegí una"
                options={options(conditionLabels)}
                value={draft.condition}
                error={errors.condition}
                onChange={(event) => update('condition', event.target.value as ListingDraft['condition'])}
              />
            </div>
          )}

          {step === 1 && (
            <div className="sell__fields">
              <div className="sell__pair">
                <Input
                  label="Kilometraje"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej. 58400"
                  value={draft.mileage}
                  error={errors.mileage}
                  onChange={(event) => update('mileage', event.target.value)}
                />
                <Select
                  label="Combustible"
                  placeholder="Elegí uno"
                  options={options(fuelLabels)}
                  value={draft.fuelType}
                  error={errors.fuelType}
                  onChange={(event) => update('fuelType', event.target.value as ListingDraft['fuelType'])}
                />
              </div>
              <div className="sell__pair">
                <Select
                  label="Transmisión"
                  placeholder="Elegí una"
                  options={options(transmissionLabels)}
                  value={draft.transmission}
                  error={errors.transmission}
                  onChange={(event) =>
                    update('transmission', event.target.value as ListingDraft['transmission'])
                  }
                />
                <Select
                  label="Carrocería"
                  placeholder="Elegí una"
                  options={options(bodyLabels)}
                  value={draft.bodyType}
                  error={errors.bodyType}
                  onChange={(event) => update('bodyType', event.target.value as ListingDraft['bodyType'])}
                />
              </div>
              <div className="sell__pair">
                <Select
                  label="Tracción (opcional)"
                  placeholder="No sé"
                  options={options(drivetrainLabels)}
                  value={draft.drivetrain}
                  onChange={(event) =>
                    update('drivetrain', event.target.value as ListingDraft['drivetrain'])
                  }
                />
                <Input
                  label="Motor (opcional)"
                  placeholder="Ej. 1.6 16v"
                  value={draft.engine}
                  onChange={(event) => update('engine', event.target.value)}
                />
              </div>
              <div className="sell__pair">
                <Input
                  label="Color (opcional)"
                  placeholder="Ej. Gris plata"
                  value={draft.color}
                  onChange={(event) => update('color', event.target.value)}
                />
                <Input
                  label="Puertas (opcional)"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej. 4"
                  value={draft.doors}
                  onChange={(event) => update('doors', event.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <PhotoUploader photos={photos} onChange={setPhotos} />
              <p className="sell__hint">
                <Icon name="check" size={15} />
                Las fotos se optimizan en tu teléfono antes de subirse, y se les borra la
                ubicación GPS que traen de la cámara.
              </p>
            </>
          )}

          {step === 3 && (
            <div className="sell__fields">
              <div className="sell__pair">
                <Input
                  label="Precio en dólares"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej. 12500"
                  value={draft.price}
                  error={errors.price}
                  onChange={(event) => update('price', event.target.value)}
                />
                <div className="sell__toggle-field">
                  <span className="field__label">Negociable</span>
                  <button
                    type="button"
                    className="toggle"
                    role="switch"
                    aria-checked={draft.negotiable}
                    onClick={() => update('negotiable', !draft.negotiable)}
                  >
                    <span className={draft.negotiable ? 'toggle__track is-on' : 'toggle__track'}>
                      <span className="toggle__knob" />
                    </span>
                    <span className="toggle__label">Acepto ofertas</span>
                  </button>
                </div>
              </div>

              <div className="sell__pair">
                <Select
                  label="Provincia"
                  placeholder="Elegí una"
                  options={provinces.map((name) => ({ value: name, label: name }))}
                  value={draft.province}
                  error={errors.province}
                  onChange={(event) => update('province', event.target.value)}
                />
                <Input
                  label="Ciudad o barrio"
                  placeholder="Ej. Palermo"
                  value={draft.city}
                  error={errors.city}
                  onChange={(event) => update('city', event.target.value)}
                />
              </div>

              <Input
                label="WhatsApp"
                type="tel"
                inputMode="tel"
                placeholder="Ej. 11 5555 4444"
                value={draft.whatsapp}
                error={errors.whatsapp}
                onChange={(event) => update('whatsapp', event.target.value)}
              />

              <div className="field">
                <label className="field__label" htmlFor="sell-description">
                  Descripción (opcional)
                </label>
                <textarea
                  id="sell-description"
                  className="field__control sell__textarea"
                  rows={5}
                  placeholder="Contá el estado real: services, si tuvo choques, qué habría que arreglar. La honestidad acá te ahorra visitas al pedo."
                  value={draft.description}
                  onChange={(event) => update('description', event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="sell__nav">
            {step > 0 ? (
              <Button variant="outline" onClick={goBack}>
                Atrás
              </Button>
            ) : (
              <span />
            )}

            {step < steps.length - 1 ? (
              <Button variant="yellow" onClick={goNext}>
                Continuar
              </Button>
            ) : (
              <Button variant="yellow" onClick={() => void publish()} disabled={publishing}>
                {publishing ? 'Publicando…' : 'Publicar'}
              </Button>
            )}
          </div>

          {failure && (
            <p className="sell__failure" role="alert">
              {failure}
            </p>
          )}
        </div>

        <aside className="sell__aside">
          <div className="card card--pad sell__summary">
            <div className="sell__summary-head">
              <h2 className="sell__summary-title">Resumen</h2>
              {savedAt && (
                <Badge tone="success">
                  Guardado {savedAt.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Badge>
              )}
            </div>

            <dl className="sell__summary-list">
              <div className="sell__summary-row">
                <dt>Vehículo</dt>
                <dd className="mono">
                  {[draft.make, draft.model, draft.year].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              <div className="sell__summary-row">
                <dt>Kilometraje</dt>
                <dd className="mono">
                  {draft.mileage ? `${Number(draft.mileage).toLocaleString('es-AR')} km` : '—'}
                </dd>
              </div>
              <div className="sell__summary-row">
                <dt>Fotos</dt>
                <dd className="mono">{photos.length || '—'}</dd>
              </div>
              <div className="sell__summary-row">
                <dt>Precio</dt>
                <dd className="mono">{draft.price ? formatPrice(Number(draft.price)) : '—'}</dd>
              </div>
            </dl>

            <p className="sell__summary-note">
              El borrador se guarda solo en este navegador. Las fotos no: si cerrás la pestaña
              hay que volver a subirlas.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
