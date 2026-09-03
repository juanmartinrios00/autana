import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  BodyType,
  FuelType,
  SellerType,
  SortOption,
  Transmission,
  VehicleCondition,
  VehicleFilters,
} from '../types'

/**
 * La query string es la única representación del estado de búsqueda.
 * Compartir una búsqueda es copiar el link, y una búsqueda guardada es
 * exactamente esta misma cadena.
 */

const SORTS: SortOption[] = ['relevance', 'price-asc', 'price-desc', 'year-desc', 'mileage-asc']

function num(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null || raw === '') return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Listas separadas por coma: `fuelType=petrol,diesel`. */
function list<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  const raw = params.get(key)
  if (!raw) return undefined
  const values = raw.split(',').filter((value): value is T => (allowed as readonly string[]).includes(value))
  return values.length ? values : undefined
}

function one<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  const raw = params.get(key)
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined
}

const FUELS: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric', 'gnc']
const BODIES: BodyType[] = ['sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van']
const CONDITIONS: VehicleCondition[] = ['new', 'used', 'certified']
const TRANSMISSIONS: Transmission[] = ['manual', 'automatic', 'cvt']
const SELLER_TYPES: SellerType[] = ['dealer', 'private']

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
    maxMileage: num(params, 'maxMileage'),
    fuelType: list(params, 'fuelType', FUELS),
    bodyType: list(params, 'bodyType', BODIES),
    condition: list(params, 'condition', CONDITIONS),
    transmission: one(params, 'transmission', TRANSMISSIONS),
    sellerType: one(params, 'sellerType', SELLER_TYPES),
  }
}

/** Cuántos filtros hay puestos, para el contador de "3 activos". */
export function countActive(filters: VehicleFilters): number {
  return Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '',
  ).length
}

export function useVehicleFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(params), [params])
  const sort = (one(params, 'sort', SORTS) ?? 'relevance') as SortOption
  const page = num(params, 'page') ?? 1

  /** Escribe un valor y vuelve a la página 1: cambiar un filtro invalida el paginado. */
  const setParam = useCallback(
    (key: string, value: string | number | string[] | undefined) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const serialized = Array.isArray(value) ? value.join(',') : value?.toString()

          if (serialized === undefined || serialized === '') next.delete(key)
          else next.set(key, serialized)

          if (key !== 'page') next.delete('page')
          return next
        },
        { replace: true, preventScrollReset: key !== 'page' },
      )
    },
    [setParams],
  )

  /** Agrega o saca un valor de un filtro de lista (combustible, carrocería…). */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = params.get(key)?.split(',').filter(Boolean) ?? []
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      setParam(key, next.length ? next : undefined)
    },
    [params, setParam],
  )

  const clearAll = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true })
  }, [setParams])

  return { params, filters, sort, page, setParam, toggleInList, clearAll }
}
