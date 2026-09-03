import { Slider } from '../ui/Slider'
import { VehicleCard } from '../vehicle/VehicleCard'
import { VehicleCardSkeleton } from '../vehicle/VehicleCardSkeleton'
import type { Vehicle } from '../../types'

interface VehicleSliderProps {
  title: string
  eyebrow?: string
  vehicles: Vehicle[]
  loading?: boolean
  action?: { label: string; to: string }
}

export function VehicleSlider({
  title,
  eyebrow,
  vehicles,
  loading = false,
  action,
}: VehicleSliderProps) {
  /* Una sección vacía no aporta nada: mejor que no exista a que muestre un
     carrusel con un hueco. */
  if (!loading && vehicles.length === 0) return null

  return (
    <Slider title={title} eyebrow={eyebrow} action={action} itemWidth="300px">
      {loading
        ? Array.from({ length: 4 }, (_, index) => <VehicleCardSkeleton key={index} />)
        : vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
    </Slider>
  )
}
