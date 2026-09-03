import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { VehicleMedia } from './VehicleMedia'
import type { Vehicle } from '../../types'

const THUMBS = 5

interface VehicleGalleryProps {
  vehicle: Vehicle
  children?: React.ReactNode
}

export function VehicleGallery({ vehicle, children }: VehicleGalleryProps) {
  const [index, setIndex] = useState(0)
  const count = vehicle.images.length
  const visible = vehicle.images.slice(0, THUMBS)
  const rest = count - visible.length

  const move = (delta: number) => setIndex((prev) => (prev + delta + count) % count)

  return (
    <div className="gallery">
      <div className="gallery__stage">
        <VehicleMedia vehicle={vehicle} index={index} />
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

      {count > 1 && (
        <div className="gallery__thumbs">
          {visible.map((image, position) => (
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
          ))}
          {rest > 0 && (
            <button type="button" className="gallery__thumb gallery__thumb--more">
              <span className="mono">+{rest}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
