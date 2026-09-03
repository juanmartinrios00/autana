import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { SLOTS, type GarageInput } from '../../lib/garage'
import type { GarageEntry, GarageSlot } from '../../types'

interface GarageSlotCardProps {
  slot: GarageSlot
  entry: GarageEntry | undefined
  /** `false` en el garage público de otra persona. */
  editable: boolean
  onSave: (input: GarageInput, photo?: File) => Promise<void>
  onRemove: () => Promise<void>
}

export function GarageSlotCard({ slot, entry, editable, onSave, onRemove }: GarageSlotCardProps) {
  const meta = SLOTS.find((item) => item.id === slot)!
  const fileRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [make, setMake] = useState(entry?.make ?? '')
  const [model, setModel] = useState(entry?.model ?? '')
  const [year, setYear] = useState(entry?.year ? String(entry.year) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(file)
    /* Vista previa inmediata con el archivo original; la compresión pasa
       recién al guardar, para no procesar algo que quizás se descarte. */
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!make.trim() || !model.trim()) {
      setError('Falta la marca o el modelo.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      await onSave(
        {
          slot,
          make: make.trim(),
          model: model.trim(),
          year: year ? Number(year) : null,
          note: note.trim(),
        },
        photo ?? undefined,
      )
      setEditing(false)
      setPhoto(null)
    } catch {
      setError('No pudimos guardarlo. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const shownPhoto = preview ?? entry?.photoUrl

  if (editing) {
    return (
      <article className="gslot gslot--editing">
        <form onSubmit={handleSubmit} className="gslot__form">
          <h3 className="gslot__title">{meta.title}</h3>

          <div className="gslot__pair">
            <Input
              label="Marca"
              placeholder="Ej. Renault"
              value={make}
              onChange={(event) => setMake(event.target.value)}
            />
            <Input
              label="Modelo"
              placeholder="Ej. Symbol"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </div>

          <Input
            label="Año (opcional)"
            type="number"
            inputMode="numeric"
            placeholder="Ej. 2009"
            value={year}
            error={error ?? undefined}
            onChange={(event) => setYear(event.target.value)}
          />

          <div className="field">
            <label className="field__label" htmlFor={`note-${slot}`}>
              Una línea sobre este auto (opcional)
            </label>
            <textarea
              id={`note-${slot}`}
              className="field__control gslot__note-input"
              rows={2}
              placeholder="Qué significó para vos"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={pickPhoto}
            aria-label="Elegir foto del auto"
          />

          <div className="gslot__actions">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {shownPhoto ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            <Button type="submit" variant="yellow" size="sm" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </article>
    )
  }

  /* Espacio vacío: la consigna es la invitación. */
  if (!entry) {
    return (
      <article className="gslot gslot--empty">
        <div className="gslot__media gslot__media--empty" aria-hidden="true" />
        <div className="gslot__body">
          <h3 className="gslot__title">{meta.title}</h3>
          <p className="gslot__hint">{meta.hint}</p>
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Icon name="plus" size={14} />
              Agregar
            </Button>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="gslot">
      <div className="gslot__media">
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt="" className="gslot__img" loading="lazy" />
        ) : (
          <span className="gslot__media--empty" aria-hidden="true" />
        )}
      </div>

      <div className="gslot__body">
        <span className="over gslot__slot">{meta.title}</span>
        <h3 className="gslot__car">
          {entry.make} {entry.model}
        </h3>
        {entry.year && <span className="gslot__year mono">{entry.year}</span>}
        {entry.note && <p className="gslot__note">{entry.note}</p>}

        {editable && (
          <div className="gslot__actions gslot__actions--quiet">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void onRemove()}>
              Quitar
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
