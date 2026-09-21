import {
  bodyTypes,
  conditions,
  currencies,
  fuelTypes,
  sellerTypes,
  sortValues,
  transmissions,
} from './format'
import type { SortOption, VehicleFilters } from '../types'

/**
 * La búsqueda, sin depender de React ni del cliente de Supabase.
 *
 * Vive aparte del hook porque ahora hay dos lugares que necesitan entender una
 * búsqueda: la pantalla `/autos` y el trabajo programado que avisa por mail
 * cuando aparece un auto que le cierra a una búsqueda guardada. Ese trabajo
 * corre en el worker, donde no hay React ni `useSearchParams`.
 *
 * Que sea un solo módulo no es prolijidad: si el aviso interpretara los filtros
 * distinto que la pantalla, mandaría mails por autos que no corresponden, y de
 * ese error nadie se entera hasta que ya se mandó.
 */

/* Los valores validos salen de `format`, que es donde el compilador ya los
   obliga a estar completos: un `Record<FuelType, string>` no compila si falta
   uno. Antes estaban escritos aca de nuevo, y era la quinta copia de las mismas
   cuatro listas.

   Que este modulo no arrastre dependencias sigue valiendo ---por eso no importa
   el tipo de `postgrest-js` y describe la consulta por su forma--- pero
   `format` no importa nada en runtime: solo tipos, que se borran al compilar.
   Traerlo no le agrega ni una linea al worker mas que las etiquetas mismas.

   Lo que se gana es que un valor nuevo del dominio no se pueda quedar afuera de
   la lectura de la URL. Si se quedaba, `?fuelType=lpg` se descartaba en
   silencio: el filtro existia en la pantalla, la URL lo decia, y la busqueda
   salia sin el. */

export function num(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null || raw === '') return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Listas separadas por coma: `fuelType=petrol,diesel`. */
export function list<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
) {
  const raw = params.get(key)
  if (!raw) return undefined
  const values = raw
    .split(',')
    .filter((value): value is T => (allowed as readonly string[]).includes(value))
  return values.length ? values : undefined
}

export function one<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
) {
  const raw = params.get(key)
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined
}

export function parseFilters(params: URLSearchParams): VehicleFilters {
  return {
    q: params.get('q') ?? undefined,
    make: params.get('make') ?? undefined,
    model: params.get('model') ?? undefined,
    province: params.get('province') ?? undefined,
    minYear: num(params, 'minYear'),
    maxYear: num(params, 'maxYear'),
    minPrice: num(params, 'minPrice'),
    maxPrice: num(params, 'maxPrice'),
    currency: one(params, 'currency', currencies),
    maxMileage: num(params, 'maxMileage'),
    fuelType: list(params, 'fuelType', fuelTypes),
    bodyType: list(params, 'bodyType', bodyTypes),
    condition: list(params, 'condition', conditions),
    transmission: one(params, 'transmission', transmissions),
    sellerType: one(params, 'sellerType', sellerTypes),
  }
}

export function parseSort(params: URLSearchParams): SortOption {
  return one(params, 'sort', sortValues) ?? 'relevance'
}

/** Cuántos filtros hay puestos, para el contador de "3 activos". */
export function countActive(filters: VehicleFilters): number {
  return Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '',
  ).length
}

function searchTerms(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter(Boolean)
    .slice(0, 6)
}

/**
 * El mínimo que tiene que saber hacer un constructor de consultas para que esto
 * le aplique los filtros. Se describe por forma y no importando el tipo de
 * `postgrest-js` a propósito: así el módulo no arrastra ninguna dependencia y
 * sirve igual desde el navegador que desde el worker.
 */
export interface FilterableQuery<Self> {
  or(filter: string): Self
  eq(column: string, value: unknown): Self
  gte(column: string, value: unknown): Self
  lte(column: string, value: unknown): Self
  in(column: string, values: readonly never[]): Self
}

/**
 * Aplica los filtros de búsqueda a una consulta de `listings`.
 *
 * `sellerType` NO se aplica acá: vive en `profiles`, así que hay que resolver
 * primero qué vendedores son de ese tipo y pasar sus ids en `sellerIds`. El que
 * llama tiene que cortar antes si esa lista viene vacía — sin ids no hay
 * resultado posible, y un `in` con lista vacía no dice eso.
 */
export function applyVehicleFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  filters: VehicleFilters,
  sellerIds?: string[],
): Q {
  /* Cada palabra tiene que aparecer en la marca o en el modelo. Antes se pedía
     la frase entera en una sola columna, así que "Renault Symbol" —la marca en
     una columna y el modelo en la otra— no encontraba nada. Los `or`
     encadenados se combinan con AND, que es justo lo que queremos. */
  for (const term of searchTerms(filters.q ?? '')) {
    query = query.or(`make.ilike.%${term}%,model.ilike.%${term}%`)
  }

  if (filters.make) query = query.eq('make', filters.make)
  if (filters.model) query = query.eq('model', filters.model)
  if (filters.province) query = query.eq('province', filters.province)
  if (filters.minYear) query = query.gte('year', filters.minYear)
  if (filters.maxYear) query = query.lte('year', filters.maxYear)
  /* El tope de precio arrastra la moneda. Sin esto, un `maxPrice=30000` se
     compara contra la columna cruda y un aviso de treinta millones de pesos
     entra en "hasta USD 30.000": el numero esta, la consulta funciona, y el
     resultado es un auto de treinta mil dolares al lado de uno que vale diez
     veces menos.

     Sin tope de precio no se filtra por moneda. Alguien que busca un auto busca
     un auto, no una moneda, y esconderle la mitad del catalogo por un dato que
     no pidio seria peor que el problema. */
  if (filters.minPrice || filters.maxPrice) {
    query = query.eq('currency', filters.currency ?? 'USD')
  }
  if (filters.minPrice) query = query.gte('price', filters.minPrice)
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
  if (filters.maxMileage !== undefined) query = query.lte('mileage', filters.maxMileage)
  if (filters.transmission) query = query.eq('transmission', filters.transmission)
  if (filters.fuelType?.length) query = query.in('fuel_type', filters.fuelType as never[])
  if (filters.bodyType?.length) query = query.in('body_type', filters.bodyType as never[])
  if (filters.condition?.length) query = query.in('condition', filters.condition as never[])
  if (sellerIds) query = query.in('seller_id', sellerIds as never[])

  return query
}
