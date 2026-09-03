import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
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

interface PhotoUploaderProps {
  photos: Photo[]
  onChange: (photos: Photo[]) => void
  max?: number
}

export function PhotoUploader({ photos, onChange, max = 20 }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function accept(files: FileList | null) {
    if (!files?.length) return

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
          id: `${Date.now()}-${added.length}`,
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

    if (added.length) onChange([...photos, ...added])
  }

  function remove(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter((item) => item.id !== id))
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
