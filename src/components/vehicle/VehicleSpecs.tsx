import {
  bodyLabels,
  drivetrainLabels,
  formatMileage,
  fuelLabels,
  transmissionLabels,
} from '../../lib/format'
import type { Vehicle } from '../../types'

/** Sólo entran las filas que el vendedor cargó: una ficha con huecos miente. */
export function VehicleSpecs({ vehicle }: { vehicle: Vehicle }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Año', value: String(vehicle.year) },
    { label: 'Kilometraje', value: formatMileage(vehicle.mileage) },
    { label: 'Motor', value: vehicle.engine },
    { label: 'Combustible', value: fuelLabels[vehicle.fuelType] },
    { label: 'Transmisión', value: transmissionLabels[vehicle.transmission] },
    { label: 'Tracción', value: drivetrainLabels[vehicle.drivetrain] },
    { label: 'Carrocería', value: bodyLabels[vehicle.bodyType] },
    { label: 'Puertas', value: String(vehicle.doors) },
    { label: 'Color', value: vehicle.color },
  ]

  if (vehicle.power !== null) {
    rows.splice(3, 0, { label: 'Potencia', value: `${vehicle.power} cv` })
  }

  return (
    <dl className="specs">
      {rows.map((row) => (
        <div className="specs__item" key={row.label}>
          <dt className="specs__label">{row.label}</dt>
          <dd className="specs__value mono">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
