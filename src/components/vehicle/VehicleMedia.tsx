import type { Vehicle } from '../../types'

interface VehicleMediaProps {
  vehicle: Pick<Vehicle, 'images'>
  /** Índice de la foto a mostrar. */
  index?: number
  /**
   * La primera foto de la pantalla: la que el navegador tiene que bajar antes
   * que nada.
   *
   * Todas las fotos del sitio son `lazy`, que es lo correcto para las que
   * están abajo. Pero la primera de una grilla o de una ficha es justo lo más
   * grande que se ve al entrar ---lo que mide el navegador como "cuándo
   * cargó"--- y marcarla perezosa la manda al final de la cola, detrás del
   * JavaScript. `eager` la saca de esa cola y `fetchPriority` la pone adelante
   * del resto.
   */
  priority?: boolean
}

/**
 * La foto del vehículo. Mientras no haya imágenes reales cargadas, pinta el
 * placeholder neutro: un bloque vacío, sin ilustración ni icono.
 */
export function VehicleMedia({ vehicle, index = 0, priority = false }: VehicleMediaProps) {
  const image = vehicle.images[index]

  if (!image?.url) {
    return <span className="vmedia vmedia--empty" aria-hidden="true" />
  }

  return (
    <img
      className="vmedia"
      src={image.url}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )
}
