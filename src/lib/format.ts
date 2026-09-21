import type {
  BodyType,
  Currency,
  Drivetrain,
  FuelType,
  ListingStatus,
  SellerType,
  SortOption,
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

/* Las opciones de cada filtro salen de las etiquetas y no de una lista escrita
   al lado.

   `Record<FuelType, string>` obliga al compilador a tener todas: agregar un
   combustible al tipo sin agregarle etiqueta no compila, y ahora eso alcanza
   para que aparezca solo en el panel de filtros. Antes eran cuatro listas mas
   en `FilterPanel`, sin nada que las obligara a estar completas: sumar un
   combustible dejaba un filtro que no lo ofrecia nunca, y ese es el peor de los
   errores mudos posibles en un buscador ---los avisos estan, la busqueda existe,
   y no hay forma de llegar.

   El orden de declaracion es el orden en que se pintan, que es para lo que
   sirve que `Object.keys` lo conserve. */
export const fuelTypes = Object.keys(fuelLabels) as FuelType[]
export const transmissions = Object.keys(transmissionLabels) as Transmission[]
export const bodyTypes = Object.keys(bodyLabels) as BodyType[]
export const conditions = Object.keys(conditionLabels) as VehicleCondition[]

/* Particular primero porque es el orden en que se ofrecen los dos selects que
   existen ---el de Ajustes y el del filtro--- y ahora los dos salen de aca. Es
   ademas el caso comun: la mayoria de los avisos son de particulares. */
export const sellerTypeLabels: Record<SellerType, string> = {
  private: 'Particular',
  dealer: 'Concesionaria',
}

export const sellerTypes = Object.keys(sellerTypeLabels) as SellerType[]

/* Cómo se nombra cada moneda en un select. El símbolo va adelante porque es lo
   que la persona reconoce de un vistazo; el código está al lado porque en
   Argentina `$` a secas es ambiguo y esa ambigüedad es justo la que este campo
   viene a sacar. */
export const currencyLabels: Record<Currency, string> = {
  USD: 'USD · dólares',
  ARS: 'ARS · pesos',
}

export const currencies = Object.keys(currencyLabels) as Currency[]

/* El orden de los resultados. Estaba escrito dos veces: el desplegable de
   `/autos` tenia su lista con las etiquetas y `search-query` tenia la suya con
   los valores validos. Agregar un orden al desplegable sin agregarlo alla
   hacia que elegirlo cayera en `relevance`: la pantalla decia "Precio: menor
   primero" y los resultados venian ordenados por otra cosa. */
export const sortLabels: Record<SortOption, string> = {
  relevance: 'Relevancia',
  'price-asc': 'Precio: menor primero',
  'price-desc': 'Precio: mayor primero',
  'year-desc': 'Año: más nuevo',
  'mileage-asc': 'Kilometraje: menor',
}

export const sortValues = Object.keys(sortLabels) as SortOption[]

export const statusLabels: Record<ListingStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  sold: 'Vendido',
  blocked: 'Bloqueada',
}

/**
 * `USD 32.900`. Sin decimales: en autos no aportan nada.
 *
 * La moneda no tiene valor por defecto a propósito. Lo tenía ---`'USD'`--- y
 * mientras todos los avisos estuvieran en dólares no se notaba; con avisos en
 * pesos, cualquier llamada que se olvide de pasarla muestra un precio en pesos
 * rotulado en dólares, que es un error de tres ceros que nadie va a leer como
 * error. Sin el default, el compilador los encuentra a todos.
 */
export function formatPrice(amount: number, currency: Currency): string {
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

/** La medianoche local del día en que cae una fecha. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** `hace 3 días`, para la antigüedad de una publicación. */
export function relativeDate(iso: string, now = new Date()): string {
  /* Días de calendario, no horas divididas por veinticuatro. Un aviso
     publicado ayer a las once de la noche y mirado hoy a las ocho de la mañana
     lleva nueve horas encima: contando por horas da cero y la ficha dice
     "publicado hoy", que no es cierto y en Novedades es peor todavía, porque
     ahí lo que se lee es una línea de tiempo.

     Restar dos medianoches locales y redondear, en vez de dividir la
     diferencia cruda: los días de cambio de horario miden veintitrés o
     veinticinco horas, y con `floor` sobre la diferencia en bruto uno de los
     dos se pierde. */
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 31) return `hace ${days} días`

  /* Pasado el año se cuenta en años. "Hace 17 meses" obliga a dividir mentalmente
     para entender que es un aviso viejo. */
  if (days >= 365) {
    const years = Math.floor(days / 365)
    return years === 1 ? 'hace un año' : `hace ${years} años`
  }

  const months = Math.floor(days / 30)
  return months === 1 ? 'hace un mes' : `hace ${months} meses`
}
