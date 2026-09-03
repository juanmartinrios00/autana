import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import './Slider.css'

interface SliderProps {
  title: string
  /** Enlace opcional del encabezado: "Ver todos". */
  action?: { label: string; to: string }
  eyebrow?: string
  children: ReactNode
  /** Ancho de cada ítem. `auto` deja que el contenido mande. */
  itemWidth?: string
}

/**
 * Carrusel horizontal.
 *
 * Es una región con scroll real, no un carrusel con `transform`: se arrastra
 * con el dedo, se navega con el teclado y funciona aunque el JS no llegue.
 * Las flechas son un atajo para mouse, y sólo aparecen si hay a dónde ir.
 */
export function Slider({ title, action, eyebrow, children, itemWidth }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setAtStart(track.scrollLeft <= 1)
    /* El margen de 1px evita que el redondeo deje la flecha activa al final. */
    setAtEnd(track.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    measure()
    const track = trackRef.current
    if (!track) return

    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure, children])

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    /* Se mueve algo menos de una pantalla, así queda una card a la vista como
       pista de que la lista sigue. */
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  const hasArrows = !atStart || !atEnd

  return (
    <section className="slider">
      <header className="slider__head">
        <div className="slider__titles">
          {eyebrow && <span className="over">{eyebrow}</span>}
          <h2 className="slider__title">{title}</h2>
        </div>

        <div className="slider__tools">
          {action && (
            <a href={action.to} className="slider__action">
              {action.label}
              <Icon name="arrowRight" size={15} />
            </a>
          )}

          {hasArrows && (
            <div className="slider__arrows">
              <button
                type="button"
                className="slider__arrow"
                onClick={() => scrollBy(-1)}
                disabled={atStart}
                aria-label={`Ver anteriores de ${title}`}
              >
                <Icon name="arrowLeft" size={17} />
              </button>
              <button
                type="button"
                className="slider__arrow"
                onClick={() => scrollBy(1)}
                disabled={atEnd}
                aria-label={`Ver siguientes de ${title}`}
              >
                <Icon name="arrowRight" size={17} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        className="slider__track"
        ref={trackRef}
        onScroll={measure}
        tabIndex={0}
        role="group"
        aria-label={title}
        style={itemWidth ? ({ '--item-width': itemWidth } as React.CSSProperties) : undefined}
      >
        {children}
      </div>
    </section>
  )
}
