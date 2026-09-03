import type { Vehicle } from '../../types'

interface VehicleMediaProps {
  vehicle: Pick<Vehicle, 'images'>
  /** Índice de la foto a mostrar. */
  index?: number
}

/**
 * La foto del vehículo. Mientras no haya imágenes reales cargadas, pinta el
 * placeholder neutro: un bloque vacío, sin ilustración ni icono.
 */
export function VehicleMedia({ vehicle, index = 0 }: VehicleMediaProps) {
  const image = vehicle.images[index]

  if (!image?.url) {
    return <span className="vmedia vmedia--empty" aria-hidden="true" />
  }

  return <img className="vmedia" src={image.url} alt={image.alt} loading="lazy" decoding="async" />
}
