import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { PhotoViewer } from './PhotoViewer'
import { VehicleMedia } from './VehicleMedia'
import type { Vehicle } from '../../types'

const THUMBS = 5

interface VehicleGalleryProps {
  vehicle: Vehicle
  children?: React.ReactNode
}

export function VehicleGallery({ vehicle, children }: VehicleGalleryProps) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const count = vehicle.images.length
  const hasPhotos = count > 0

  /* La tira sigue a la foto que se está viendo.

     Antes mostraba siempre las cinco primeras, así que en un aviso de ocho
     fotos ---que son los buenos, y el logro de "publicación completa" pide
     justamente ocho--- pasar la quinta con las flechas dejaba la tira entera
     sin ninguna marcada: la foto grande cambiaba y abajo no se movía nada, como
     si la navegación se hubiera desenganchado.

     La ventana se corre recién cuando hace falta y se frena contra el final,
     para que no quede media tira vacía en la última foto. */
  const start = Math.min(Math.max(0, index - 2), Math.max(0, count - THUMBS))
  const visible = vehicle.images.slice(start, start + THUMBS)
  /* Las que quedan después de la ventana. Las de antes se alcanzan con la
     flecha, que es de donde vino quien está mirando la sexta. */
  const rest = count - (start + visible.length)

  const move = (delta: number) => setIndex((prev) => (prev + delta + count) % count)

  return (
    <div className="gallery">
      <div className="gallery__stage">
        {/* La foto abre el visor. Es un botón y no un `div` con `onClick`:
            así se llega con el teclado y un lector de pantalla dice qué hace.
            Sin fotos cargadas no abre nada: el recuadro vacío no es una foto. */}
        {hasPhotos ? (
          <button
            type="button"
            className="gallery__open"
            aria-label={`Ver la foto ${index + 1} a pantalla completa`}
            onClick={() => setZoom(true)}
          >
            <VehicleMedia vehicle={vehicle} index={index} />
          </button>
        ) : (
          <VehicleMedia vehicle={vehicle} index={index} />
        )}
        {children}

        {count > 1 && (
          <>
            <button
              type="button"
              className="fav gallery__nav gallery__nav--prev"
              aria-label="Foto anterior"
              onClick={() => move(-1)}
            >
              <Icon name="arrowLeft" size={18} />
            </button>
            <button
              type="button"
              className="fav gallery__nav gallery__nav--next"
              aria-label="Foto siguiente"
              onClick={() => move(1)}
            >
              <Icon name="arrowRight" size={18} />
            </button>
            <span className="gallery__counter mono" aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {/* Al cerrar, la ficha queda en la foto que estaba mirando a pantalla
          completa: volver a la primera sería perder el lugar. */}
      {zoom && <PhotoViewer vehicle={vehicle} start={index} onClose={(last) => { setIndex(last); setZoom(false) }} />}

      {count > 1 && (
        <div className="gallery__thumbs">
          {visible.map((image, offset) => {
            /* La posición real en el aviso, no la posición dentro de la
               ventana: si no, al correrse la tira la miniatura marcada y el
               número del contador dejan de coincidir. */
            const position = start + offset
            return (
              <button
                key={image.id}
                type="button"
                className={position === index ? 'gallery__thumb is-on' : 'gallery__thumb'}
                aria-label={`Ver foto ${position + 1} de ${count}`}
                aria-current={position === index}
                onClick={() => setIndex(position)}
              >
                <VehicleMedia vehicle={vehicle} index={position} />
              </button>
            )
          })}
          {rest > 0 && (
            /* Tenía la forma de un botón, el cursor de un botón y el foco de un
               botón, y no hacía nada: quien tocaba "+3" para ver las tres que
               faltaban se quedaba mirando la misma foto. Ahora salta a la
               primera de esas, que es lo que el cartel promete. */
            <button
              type="button"
              className="gallery__thumb gallery__thumb--more"
              aria-label={`Ver las otras ${rest} fotos`}
              onClick={() => setIndex(start + THUMBS)}
            >
              <span className="mono">+{rest}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
