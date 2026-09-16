import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import {
  compressImage,
  formatBytes,
  ImageTooLargeError,
  UnsupportedImageError,
  type CompressedImage,
} from '../../lib/images'

export interface Photo extends CompressedImage {
  id: string
  originalBytes: number
}

/* Un contador y no `Date.now()` con el índice de la tanda. Ahora que dos tandas
   pueden estar comprimiendo a la vez, dos fotos pueden terminar en el mismo
   milisegundo con el mismo índice local, y ahí salen dos ids iguales: dos
   `key` repetidas para React, y un `remove` que saca la que no era. */
let nextPhotoId = 0

interface PhotoUploaderProps {
  photos: Photo[]
  /**
   * Recibe el `setState` entero y no una lista ya armada.
   *
   * Comprimir es asíncrono y tarda lo suyo: una tanda de cinco fotos de celular
   * se lleva un par de segundos. En ese rato la persona puede soltar otra
   * tanda, y la segunda llamada a `accept` tiene el `photos` del render en el
   * que arrancó ---todavía sin las de la primera. Escribir `[...photos, ...]`
   * con esa lista vieja pisaba la tanda anterior: se soltaban diez fotos y
   * subían cinco, sin ningún error en el medio.
   */
  onChange: Dispatch<SetStateAction<Photo[]>>
  max?: number
}

export function PhotoUploader({ photos, onChange, max = 20 }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function accept(files: FileList | null) {
    if (!files?.length) return

    setError(null)

    const room = max - photos.length
    const batch = Array.from(files).slice(0, room)
    if (batch.length < files.length) {
      setError(`Se pueden subir hasta ${max} fotos.`)
    }

    setBusy(batch.length)
    const added: Photo[] = []

    for (const file of batch) {
      try {
        const compressed = await compressImage(file)
        added.push({
          ...compressed,
          id: `photo-${(nextPhotoId += 1)}`,
          originalBytes: file.size,
        })
      } catch (cause) {
        if (cause instanceof ImageTooLargeError) setError(`"${file.name}" supera los 12 MB.`)
        else if (cause instanceof UnsupportedImageError) setError(`"${file.name}" no es una imagen.`)
        else setError('No pudimos procesar una de las fotos.')
      } finally {
        setBusy((count) => count - 1)
      }
    }

    /* El `slice` es el que sostiene el tope cuando entran dos tandas a la vez:
       cada una calculó su lugar disponible contra una lista que la otra
       todavía no había tocado. */
    if (added.length) onChange((current) => [...current, ...added].slice(0, max))
  }

  function remove(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange((current) => current.filter((item) => item.id !== id))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void accept(event.dataTransfer.files)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void accept(event.target.files)
    event.target.value = ''
  }

  const saved = photos.reduce((total, photo) => total + photo.originalBytes - photo.bytes, 0)

  return (
    <div className="uploader">
      <div
        className={dragging ? 'dropzone is-dragging' : 'dropzone'}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="dropzone__icon" aria-hidden="true">
          <Icon name="plus" size={26} />
        </span>
        <h3 className="dropzone__title">Soltá las fotos acá</h3>
        <p className="dropzone__text">JPG, PNG o WEBP · hasta 12 MB cada una · máximo {max} fotos</p>
        <Button variant="dark" onClick={() => inputRef.current?.click()}>
          Elegir archivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleInput}
          aria-label="Elegir fotos del vehículo"
        />
      </div>

      {error && (
        <p className="uploader__error" role="alert">
          {error}
        </p>
      )}

      {(photos.length > 0 || busy > 0) && (
        <>
          <div className="uploader__head">
            <h3 className="uploader__count">
              {photos.length} {photos.length === 1 ? 'foto cargada' : 'fotos cargadas'}
            </h3>
            {saved > 0 && (
              <span className="uploader__saved">
                Optimizadas: {formatBytes(saved)} menos para subir
              </span>
            )}
          </div>

          <div className="uploader__grid">
            {photos.map((photo, index) => (
              <div className={index === 0 ? 'thumb thumb--main' : 'thumb'} key={photo.id}>
                <img src={photo.previewUrl} alt="" className="thumb__img" />
                {index === 0 && (
                  <Badge tone="accent" className="thumb__badge">
                    Principal
                  </Badge>
                )}
                <button
                  type="button"
                  className="fav thumb__remove"
                  aria-label={`Eliminar foto ${index + 1}`}
                  onClick={() => remove(photo.id)}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}

            {Array.from({ length: busy }, (_, index) => (
              <div className="thumb thumb--busy" key={`busy-${index}`}>
                <span className="mono">Optimizando…</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
