import {
  bodyLabels,
  drivetrainLabels,
  formatMileage,
  fuelLabels,
  transmissionLabels,
} from '../../lib/format'
import type { Vehicle } from '../../types'
import { Icon, type IconName } from '../ui/Icon'
import { Odometro } from './Odometro'

/** Sólo entran las filas que el vendedor cargó: una ficha con huecos miente. */
export function VehicleSpecs({ vehicle }: { vehicle: Vehicle }) {
  const rows: { label: string; value: string; icon: IconName; odometro?: boolean }[] = [
    { label: 'Año', value: String(vehicle.year), icon: 'calendar' as const },
    { label: 'Kilometraje', value: formatMileage(vehicle.mileage), icon: 'gauge' as const, odometro: true },
    { label: 'Motor', value: vehicle.engine, icon: 'engine' as const },
    { label: 'Combustible', value: fuelLabels[vehicle.fuelType], icon: 'fuel' as const },
    { label: 'Transmisión', value: transmissionLabels[vehicle.transmission], icon: 'gearbox' as const },
    {
      label: 'Tracción',
      value: vehicle.drivetrain ? drivetrainLabels[vehicle.drivetrain] : '',
      icon: 'drivetrain' as const,
    },
    { label: 'Carrocería', value: bodyLabels[vehicle.bodyType], icon: 'car' as const },
    { label: 'Puertas', value: vehicle.doors ? String(vehicle.doors) : '', icon: 'door' as const },
    { label: 'Color', value: vehicle.color, icon: 'paint' as const },
  ].filter((row) => row.value.trim() !== '')

  if (vehicle.power !== null) {
    rows.splice(3, 0, { label: 'Potencia', value: `${vehicle.power} cv`, icon: 'power' })
  }

  return (
    <dl className="specs">
      {rows.map((row) => (
        <div className="specs__item" key={row.label}>
          <span className="specs__icon" aria-hidden="true">
            <Icon name={row.icon} size={20} />
          </span>
          <dt className="specs__label">{row.label}</dt>
          <dd className="specs__value">
            {row.odometro ? <Odometro km={vehicle.mileage} /> : row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
