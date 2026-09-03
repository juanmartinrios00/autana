import type {
  BodyType,
  Drivetrain,
  FuelType,
  ListingStatus,
  SellerType,
  Transmission,
  Vehicle,
  VehicleCondition,
} from '../types'

/* Un solo lugar donde los valores del dominio se vuelven texto en pantalla.
   Cuando llegue el backend en Go, los valores no cambian: solo estas etiquetas. */

export const conditionLabels: Record<VehicleCondition, string> = {
  new: '0 km',
  used: 'Usado',
  certified: 'Certificado',
}

export const fuelLabels: Record<FuelType, string> = {
  petrol: 'Nafta',
  diesel: 'Diésel',
  hybrid: 'Híbrido',
  electric: 'Eléctrico',
  gnc: 'GNC',
}

export const transmissionLabels: Record<Transmission, string> = {
  manual: 'Manual',
  automatic: 'Automática',
  cvt: 'CVT',
}

export const drivetrainLabels: Record<Drivetrain, string> = {
  fwd: 'Delantera',
  rwd: 'Trasera',
  awd: 'Integral',
  '4x4': '4x4',
}

export const bodyLabels: Record<BodyType, string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  hatchback: 'Hatchback',
  pickup: 'Pick-up',
  coupe: 'Coupé',
  van: 'Utilitario',
}

export const sellerTypeLabels: Record<SellerType, string> = {
  dealer: 'Concesionaria',
  private: 'Particular',
}

export const statusLabels: Record<ListingStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  sold: 'Vendido',
}

/** `USD 32.900`. Sin decimales: en autos no aportan nada. */
export function formatPrice(amount: number, currency: 'USD' | 'ARS' = 'USD'): string {
  return `${currency} ${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

/** `34.200 km`, y `0 km` para los nuevos. */
export function formatMileage(km: number): string {
  return `${km.toLocaleString('es-AR')} km`
}

export function formatCount(value: number): string {
  return value.toLocaleString('es-AR')
}

/** El título público del vehículo: `BMW 320i Sport Line`. */
export function vehicleTitle(vehicle: Pick<Vehicle, 'make' | 'model' | 'trim'>): string {
  return [vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
}

/** La línea de datos de la card: `2022 · 34.200 km · Automática`. */
export function vehicleMeta(
  vehicle: Pick<Vehicle, 'year' | 'mileage' | 'transmission'>,
): string {
  return [
    String(vehicle.year),
    formatMileage(vehicle.mileage),
    transmissionLabels[vehicle.transmission],
  ].join(' · ')
}

export function locationLabel(location: { city: string; province: string }): string {
  return location.city === location.province
    ? location.city
    : `${location.city}, ${location.province}`
}

/** `hace 3 días`, para la antigüedad de una publicación. */
export function relativeDate(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 31) return `hace ${days} días`
  const months = Math.floor(days / 30)
  return months === 1 ? 'hace un mes' : `hace ${months} meses`
}
