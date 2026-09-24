import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import type { Vehicle } from '../../types'
import './PhotoViewer.css'

/**
 * Las fotos a pantalla completa.
 *
 * Un auto se vende por las fotos, y en la ficha se veían en un recuadro de
 * 16/10 con las esquinas redondeadas: para mirar el paragolpe o el tapizado
 * había que confiar. Acá ocupan toda la pantalla, enteras (`contain`, sin
 * recortar) y sobre negro, que es lo que deja ver una foto.
 *
 * Es un `<dialog>` de verdad y no un `div` encima: el navegador ya sabe cerrar
 * con Escape, dejar el foco adentro y apagar el resto de la página para quien
 * usa lector de pantalla. Todo eso escrito a mano se hace mal.
 *
 * Pasar de foto es un desplazamiento horizontal con imán (`scroll-snap`), no un
 * carrusel con `transform`: en el celular el dedo lo mueve como en cualquier
 * app de fotos, con su inercia y su rebote, gratis. Las flechas y el teclado
 * empujan ese mismo desplazamiento.
 */
export function PhotoViewer({
  vehicle,
  start,
  onClose,
}: {
  vehicle: Vehicle
  /** Con cuál abrir: la que se estaba viendo en la ficha. */
  start: number
  onClose: (last: number) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(start)
  const count = vehicle.images.length

  /* `showModal` y no el atributo `open`: lo que hace modal al diálogo ---el
     fondo inerte, el foco adentro, el Escape--- viene de abrirlo así. */
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    /* Sin animación: el ancho recién existe cuando el diálogo está abierto. */
    const track = trackRef.current
    if (track) track.scrollLeft = start * track.clientWidth
  }, [start])

  function handleScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  function move(delta: number) {
    const track = trackRef.current
    if (!track) return
    /* Al principio y al final se queda donde está: dar la vuelta con un
       desplazamiento sería un salto largo, que acá se ve como un error. */
    track.scrollBy({ left: delta * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <dialog
      ref={dialogRef}
      className="viewer"
      aria-label={`Fotos de ${vehicle.make} ${vehicle.model}`}
      onClose={() => onClose(index)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') move(1)
        if (event.key === 'ArrowLeft') move(-1)
      }}
    >
      <div className="viewer__track" ref={trackRef} onScroll={handleScroll}>
        {vehicle.images.map((image, position) => (
          <div className="viewer__slide" key={image.id}>
            <img
              src={image.url}
              alt={image.alt}
              className="viewer__photo"
              /* La primera va enseguida; las otras cuando se acercan. */
              loading={position === start ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="viewer__close"
        aria-label="Cerrar las fotos"
        onClick={() => dialogRef.current?.close()}
      >
        <Icon name="close" size={20} />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            className="viewer__nav viewer__nav--prev"
            aria-label="Foto anterior"
            onClick={() => move(-1)}
          >
            <Icon name="arrowLeft" size={20} />
          </button>
          <button
            type="button"
            className="viewer__nav viewer__nav--next"
            aria-label="Foto siguiente"
            onClick={() => move(1)}
          >
            <Icon name="arrowRight" size={20} />
          </button>
          <span className="viewer__counter mono" aria-live="polite">
            {index + 1} / {count}
          </span>
        </>
      )}
    </dialog>
  )
}
