import { VehicleCard } from './VehicleCard'
import { VehicleCardSkeleton } from './VehicleCardSkeleton'
import type { Vehicle } from '../../types'

interface VehicleGridProps {
  vehicles: Vehicle[]
  layout?: 'grid' | 'list'
  loading?: boolean
  /** Cuántos esqueletos pintar mientras carga. */
  skeletonCount?: number
}

export function VehicleGrid({
  vehicles,
  layout = 'grid',
  loading = false,
  skeletonCount = 6,
}: VehicleGridProps) {
  return (
    <div className={`vgrid vgrid--${layout}`} aria-busy={loading}>
      {loading
        ? Array.from({ length: skeletonCount }, (_, index) => (
            <VehicleCardSkeleton key={index} layout={layout} />
          ))
        : vehicles.map((vehicle, index) => (
            /* Sólo la primera: es la única que está arriba de todo en el
               celular, y marcar varias como prioritarias es no marcar ninguna. */
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              layout={layout}
              priority={index === 0}
            />
          ))}
    </div>
  )
}
