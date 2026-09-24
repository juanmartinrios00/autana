import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MissionCard } from '../components/levels/MissionCard'
import { ShareButton } from '../components/vehicle/ShareButton'
import { PhotoUploader, type Photo } from '../components/sell/PhotoUploader'
import { AmountInput } from '../components/ui/AmountInput'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { BRAND, pageTitle } from '../config/brand'
import { provinces } from '../data/makes'
import { useAuth } from '../hooks/useAuth'
import { draftFromVehicle, useListingDraft, type ListingDraft } from '../hooks/useListingDraft'
import {
  createListing,
  deleteListingImage,
  getLevelInput,
  getOwnWhatsapp,
  getVehicleBySlug,
  updateListing,
  uploadListingPhotos,
} from '../lib/api'
import { describeError } from '../lib/errors'
import { computeLevel, type Achievement, type LevelState } from '../lib/levels'
import { levelChange, photosMission, type Mission } from '../lib/missions'
import { currencies, currencyLabels } from '../lib/format'
import { LIMITS, PRICE_RANGE } from '../lib/limits'
import { toE164 } from '../lib/whatsapp'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  bodyLabels,
  conditionLabels,
  drivetrainLabels,
  formatPrice,
  fuelLabels,
  transmissionLabels,
} from '../lib/format'
import type { Currency, VehicleImage } from '../types'
import './Sell.css'
import { reportError } from '../lib/report'

const steps = ['Vehículo', 'Detalles', 'Fotos', 'Precio y contacto'] as const

/** "A", "A y B", "A, B y C". */
function enLista(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

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
    /* El rango depende de la moneda: los mismos 12.500 son un precio normal en
       dólares y un error de tipeo en pesos. Es justo el control que hace falta
       ahora que se puede elegir, porque publicar con el select en la moneda
       equivocada es el error fácil de cometer. */
    const price = Number(draft.price)
    const range = PRICE_RANGE[draft.currency]
    if (!draft.price) errors.price = 'Falta el precio.'
    else if (price < range.min || price > range.max) {
      errors.price = `Poné un precio en ${draft.currency === 'ARS' ? 'pesos' : 'dólares'} realista.`
    }
    if (!draft.province) errors.province = 'Elegí la provincia.'
    if (!draft.city.trim()) errors.city = 'Falta la ciudad o el barrio.'
    /* Se valida con la misma funcion que arma el link de WhatsApp, y no con
       una forma parecida: si `toE164` no puede armar un numero contactable, el
       aviso se publica con un boton de contacto que no lleva a ningun lado y
       el vendedor no se entera nunca. La puerta tiene que rechazar exactamente
       lo que la salida no sabe usar. */
    if (!toE164(draft.whatsapp)) errors.whatsapp = 'Poné un WhatsApp válido con característica.'
  }

  return errors
}

/**
 * El primer paso que quedó incompleto, para no dejar guardar un aviso al que
 * le falta algo de un paso anterior. Al publicar de corrido no pasa —cada
 * paso se valida al avanzar— pero al editar se puede vaciar un campo del
 * paso 1 y saltar directo a guardar.
 */
function firstInvalidStep(draft: ListingDraft) {
  for (const step of [0, 1, 3]) {
    const errors = validate(step, draft)
    if (Object.keys(errors).length > 0) return { step, errors }
  }
  return null
}

function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}

/**
 * Publicar un aviso nuevo y editar uno existente son el mismo formulario.
 *
 * Con `/vender` arranca vacío y va guardando el borrador en el navegador; con
 * `/vender/:slug/editar` arranca lleno con lo que hay en la base y no toca ese
 * borrador. Duplicar la pantalla habría significado mantener dos veces las
 * mismas validaciones y los mismos campos.
 */
export function Sell() {
  const { slug } = useParams()
  const editing = Boolean(slug)

  const { draft, update, replace, reset, savedAt } = useListingDraft({ persist: !editing })
  const { session } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [photos, setPhotos] = useState<Photo[]>([])

  /* Cada foto comprimida deja una `blob:` viva hasta que alguien la revoca, y
     una foto de celular comprimida pesa unos doscientos kilobytes: veinte son
     cuatro megas que el navegador se guarda hasta recargar la página. El
     `remove` de cada miniatura ya revoca la suya; lo que faltaba era el caso de
     irse del formulario, que es el más común de todos ---se publica el aviso y
     se navega a la ficha.

     Se lee de una ref y no de `photos` para que el efecto no corra en cada
     cambio de la lista: si dependiera de `photos`, la limpieza se dispararía al
     sumar una foto y revocaría las que todavía se están mostrando. */
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    },
    [],
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ListingDraft, string>>>({})
  const [publishing, setPublishing] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)

  /* El nivel antes de publicar, para decir después qué se ganó. Con la cuenta
     a la que pertenece, como el resto del código. */
  const [levelBefore, setLevelBefore] = useState<{ for: string; value: LevelState } | null>(null)
  /* Lo que se ganó con el aviso recién publicado, con el slug al que
     pertenece: "Publicar otro" no puede mostrar los logros del anterior. */
  const [outcome, setOutcome] = useState<{
    slug: string
    earned: Achievement[]
    newLevel: string | null
    mission: Mission | null
  } | null>(null)

  /* Sólo se usan al editar: el aviso que se está tocando y las fotos que ya
     están subidas, que se manejan aparte de las nuevas. */
  const [listingId, setListingId] = useState<string | null>(null)
  const [existing, setExisting] = useState<VehicleImage[]>([])
  const [denied, setDenied] = useState(false)
  /* Qué aviso quedó cargado. Comparándolo con el de la URL sale si estamos
     esperando, sin un `loading` que haya que prender y apagar a mano — que
     además es un setState síncrono dentro del efecto. */
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null)

  /* Se depende del id y no del objeto `session`: cada refresh de token trae
     una sesión nueva, y con el objeto en las dependencias el efecto volvería a
     correr y `replace` pisaría los cambios sin guardar de quien está editando. */
  const userId = session?.user.id ?? ''

  useDocumentMeta({
    title: editing ? pageTitle('Editar aviso') : pageTitle('Publicar tu auto'),
    description: editing
      ? undefined
      : `Publicá tu auto en ${BRAND}: cargá las fotos, el precio y los datos, y te contactan directo.`,
  })

  /* Sólo al publicar uno nuevo: la edición vuelve directo a la ficha. Si
     falla, la pantalla de listo sale igual, sin los logros. */
  useEffect(() => {
    if (editing || !userId) return
    let current = true
    void getLevelInput(userId)
      .then((input) => {
        if (current) setLevelBefore({ for: userId, value: computeLevel(input) })
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [editing, userId])

  useEffect(() => {
    if (!editing || !slug || !userId) return
    let current = true

    /* El numero ya no viene con el perfil —desde la migracion 008 no se lee de
       `profiles`— asi que se pide aparte, y la base solo devuelve el propio.
       Sin esto, editar un aviso arrancaba con el campo vacio y lo borraba al
       guardar. */
    void Promise.all([getVehicleBySlug(slug), getOwnWhatsapp().catch(() => null)])
      .then(([vehicle, own]) => {
        if (!current) return

        /* RLS ya impide traer el aviso de otro si no está activo, pero uno
           activo sí se puede leer: el dueño hay que chequearlo acá. */
        if (vehicle.sellerId !== userId) {
          setDenied(true)
          return
        }

        setListingId(vehicle.id)
        setExisting(vehicle.images)
        replace(draftFromVehicle(vehicle, own ?? ''))
      })
      .catch((cause) => {
        if (!current) return
        reportError('cargar el aviso para editar', cause)
        setDenied(true)
      })
      .finally(() => {
        if (current) setLoadedSlug(slug)
      })

    return () => {
      current = false
    }
  }, [editing, slug, userId, replace])

  const loading = editing && loadedSlug !== slug

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

  /* Quita una foto ya subida. Se aplica en el momento, no al guardar: dejarla
     "pendiente de borrar" obligaría a sincronizar dos listas y a deshacer la
     subida si el guardado falla. */
  async function removeExisting(imageId: string) {
    setFailure(null)
    try {
      await deleteListingImage(imageId)
      setExisting((current) => current.filter((image) => image.id !== imageId))
    } catch (cause) {
      reportError('deleteListingImage', cause)
      setFailure(describeError(cause, 'No pudimos borrar la foto.'))
    }
  }

  async function save() {
    const invalid = firstInvalidStep(draft)
    if (invalid) {
      setStep(invalid.step)
      setErrors(invalid.errors)
      window.scrollTo({ top: 0 })
      return
    }
    setErrors({})
    if (!session) return

    setPublishing(true)
    setFailure(null)

    try {
      /* El `maxLength` de los campos frena lo que se escribe, pero no lo que ya
         estaba: el borrador se guarda en el navegador y uno empezado antes de
         que existieran los topes vuelve con el largo viejo. Se recorta al
         armar el payload, que es el ultimo lugar por el que pasa todo. */
      const cap = (value: string, max: number) => value.trim().slice(0, max)

      const input = {
        make: cap(draft.make, LIMITS.make),
        model: cap(draft.model, LIMITS.model),
        trim: cap(draft.trim, LIMITS.trim) || null,
        year: Number(draft.year),
        price: Number(draft.price),
        currency: draft.currency,
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
        city: cap(draft.city, LIMITS.city),
        province: draft.province,
        description: cap(draft.description, LIMITS.description),
        whatsapp: draft.whatsapp.trim(),
      }

      if (editing && listingId && slug) {
        await updateListing(listingId, input, session.user.id)

        /* Las fotos nuevas arrancan después de la última posición ocupada, no
           en la cantidad que hay: si se borró una del medio, contar daría una
           posición repetida y el orden quedaría al azar. */
        if (photos.length > 0) {
          const next = existing.reduce((max, image) => Math.max(max, image.order + 1), 0)
          await uploadListingPhotos(listingId, session.user.id, photos.map((photo) => photo.blob), next)
        }

        navigate(`/autos/${slug}`)
        return
      }

      const vehicle = await createListing(
        input,
        photos.map((photo) => photo.blob),
        session.user.id,
      )

      setPublishedSlug(vehicle.slug)
      window.scrollTo({ top: 0 })

      /* Después de publicar, y sin esperarlo: la pantalla de listo no depende
         de esto. Lo de ahora pasa a ser el "antes" del próximo, por si toca
         "Publicar otro". */
      const before = levelBefore?.for === userId ? levelBefore.value : null
      const owner = userId
      const car = { make: draft.make, model: draft.model, slug: vehicle.slug }
      const sent = photos.length
      void getLevelInput(owner)
        .then((input) => {
          const after = computeLevel(input)
          const richDone = after.achievements.find((item) => item.id === 'rich_listing')?.done
          setLevelBefore({ for: owner, value: after })
          setOutcome({
            slug: vehicle.slug,
            ...(before ? levelChange(before, after) : { earned: [], newLevel: null }),
            mission: richDone ? null : photosMission(car, sent),
          })
        })
        .catch(() => {})
    } catch (cause) {
      reportError(editing ? 'updateListing' : 'createListing', cause)
      setFailure(
        describeError(
          cause,
          editing
            ? 'No pudimos guardar los cambios. Probá de nuevo en un momento.'
            : 'No pudimos publicar el aviso. Probá de nuevo en un momento.',
        ),
      )
    } finally {
      setPublishing(false)
    }
  }

  if (denied) {
    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="No podés editar este aviso"
          description="O no existe, o es de otra cuenta."
          action={
            <Link to="/perfil">
              <Button variant="yellow">Ir a mis publicaciones</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page section">
        <Skeleton height="420px" />
      </div>
    )
  }

  if (publishedSlug) {
    const result = outcome?.slug === publishedSlug ? outcome : null
    return (
      <div className="page section sell__done">
        <div className="card card--pad sell__done-card">
          <span className="sell__done-icon">
            <Icon name="check" size={28} />
          </span>
          <h1>Tu publicación está lista</h1>
          <p className="sell__done-text">
            {draft.make} {draft.model} {draft.year} ·{' '}
            {formatPrice(Number(draft.price), draft.currency)}
          </p>
          <p className="sell__done-note">
            Ya es visible para cualquiera que entre al marketplace.
          </p>
          {result && result.earned.length > 0 && (
            <p className="sell__done-earned">
              Sumaste {enLista(result.earned.map((item) => `«${item.title}»`))}.
              {result.newLevel && ` Subiste a ${result.newLevel}.`}{' '}
              <Link to="/niveles">Qué son los logros</Link>
            </p>
          )}
          {result?.mission && <MissionCard mission={result.mission} className="sell__done-mission" />}
          {/* El momento en que alguien quiere mandar su auto: lo acaba de
              publicar y lo primero que hace es pasárselo a los conocidos. Antes
              tenía que entrar al aviso y copiar la dirección del navegador. */}
          <div className="sell__done-share">
            <ShareButton
              title={`${draft.make} ${draft.model} ${draft.year}`}
              price={formatPrice(Number(draft.price), draft.currency)}
              url={`${window.location.origin}/autos/${publishedSlug}`}
              block
            />
          </div>

          <div className="sell__done-actions">
            <Button variant="yellow" onClick={() => navigate(`/autos/${publishedSlug}`)}>
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
              {step === 0 && (editing ? 'Editá tu publicación' : 'Contanos qué auto vendés')}
              {step === 1 && 'Los datos del vehículo'}
              {step === 2 && (editing ? 'Las fotos del aviso' : 'Subí las fotos')}
              {step === 3 && 'Precio, ubicación y contacto'}
            </h1>
            <p className="sell__lead">
              {step === 0 && 'Con la marca, el modelo y el año alcanza para empezar.'}
              {step === 1 && 'Cuanto más completo, más consultas vas a recibir.'}
              {step === 2 &&
                (editing
                  ? 'Quitá las que ya no van y sumá las que falten. Los cambios en las fotos se aplican al instante, sin esperar a guardar.'
                  : 'Las publicaciones con 8 fotos o más reciben el triple de consultas. La primera es la que se ve en los resultados.')}
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
                  maxLength={LIMITS.make}
                  onChange={(event) => update('make', event.target.value)}
                />
                <Input
                  label="Modelo"
                  placeholder="Ej. Symbol"
                  value={draft.model}
                  error={errors.model}
                  maxLength={LIMITS.model}
                  onChange={(event) => update('model', event.target.value)}
                />
              </div>
              <div className="sell__pair">
                <Input
                  label="Versión (opcional)"
                  placeholder="Ej. Luxe 1.6"
                  value={draft.trim}
                  maxLength={LIMITS.trim}
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
                <AmountInput
                  label="Kilometraje"
                  placeholder="Ej. 58.400"
                  value={draft.mileage}
                  error={errors.mileage}
                  onValueChange={(value) => update('mileage', value)}
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
              {/* Las que ya están subidas van aparte de las nuevas: unas viven
                  en el bucket y otras son blobs en memoria, y mezclarlas en la
                  misma lista obligaría a que cada foto sepa de dónde salió. */}
              {editing && existing.length > 0 && (
                <div className="uploaded">
                  <h2 className="uploaded__title">
                    {existing.length} {existing.length === 1 ? 'foto publicada' : 'fotos publicadas'}
                  </h2>
                  <ul className="uploaded__grid">
                    {existing.map((image, index) => (
                      <li className="uploaded__item" key={image.id}>
                        <img src={image.url} alt={image.alt} loading="lazy" className="uploaded__img" />
                        {index === 0 && <Badge tone="dark" className="uploaded__main">Principal</Badge>}
                        <button
                          type="button"
                          className="uploaded__remove"
                          onClick={() => void removeExisting(image.id)}
                          aria-label={`Quitar la foto ${index + 1}`}
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                {/* El precio y su moneda van juntos y no en filas distintas: son
                    un solo dato, y separados se puede escribir el número sin
                    mirar el select. El ejemplo del placeholder cambia con la
                    moneda por lo mismo. */}
                <div className="sell__price">
                  <AmountInput
                    label="Precio"
                    placeholder={draft.currency === 'ARS' ? 'Ej. 18.500.000' : 'Ej. 12.500'}
                    value={draft.price}
                    error={errors.price}
                    onValueChange={(value) => update('price', value)}
                  />
                  <Select
                    label="Moneda"
                    className="sell__currency"
                    options={currencies.map((value) => ({
                      value,
                      label: currencyLabels[value],
                    }))}
                    value={draft.currency}
                    onChange={(event) => update('currency', event.target.value as Currency)}
                  />
                </div>
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
                  maxLength={LIMITS.city}
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
                  maxLength={LIMITS.description}
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
              <Button variant="yellow" onClick={() => void save()} disabled={publishing}>
                {editing
                  ? publishing
                    ? 'Guardando…'
                    : 'Guardar cambios'
                  : publishing
                    ? 'Publicando…'
                    : 'Publicar'}
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
                <dd className="mono">{existing.length + photos.length || '—'}</dd>
              </div>
              <div className="sell__summary-row">
                <dt>Precio</dt>
                <dd className="mono">
                  {draft.price ? formatPrice(Number(draft.price), draft.currency) : '—'}
                </dd>
              </div>
            </dl>

            <p className="sell__summary-note">
              {editing
                ? 'Los cambios se guardan recién cuando apretás "Guardar cambios". El link del aviso no cambia, así que lo que ya compartiste sigue funcionando.'
                : 'El borrador se guarda solo en este navegador. Las fotos no: si cerrás la pestaña hay que volver a subirlas.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
