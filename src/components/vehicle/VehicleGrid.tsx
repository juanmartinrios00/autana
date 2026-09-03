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
        : vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} layout={layout} />
          ))}
    </div>
  )
}
