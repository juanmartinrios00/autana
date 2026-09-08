import { useCallback, useEffect, useState } from 'react'
import type {
  BodyType,
  Drivetrain,
  FuelType,
  Transmission,
  Vehicle,
  VehicleCondition,
} from '../types'

/**
 * El borrador de la publicación. Todo se guarda como texto porque viene de
 * inputs; la conversión a números pasa recién al publicar.
 *
 * Las fotos NO entran acá: son blobs y no sobreviven a `JSON.stringify`.
 * Viven en memoria mientras dura la pestaña, y se avisa en la UI.
 */
export interface ListingDraft {
  make: string
  model: string
  trim: string
  year: string
  condition: VehicleCondition | ''
  mileage: string
  fuelType: FuelType | ''
  transmission: Transmission | ''
  bodyType: BodyType | ''
  drivetrain: Drivetrain | ''
  engine: string
  doors: string
  color: string
  price: string
  negotiable: boolean
  city: string
  province: string
  description: string
  whatsapp: string
}

export const emptyDraft: ListingDraft = {
  make: '', model: '', trim: '', year: '', condition: '',
  mileage: '', fuelType: '', transmission: '', bodyType: '', drivetrain: '',
  engine: '', doors: '', color: '',
  price: '', negotiable: false,
  city: '', province: '',
  description: '', whatsapp: '',
}

const STORAGE_KEY = 'autana:listing-draft'

function read(): ListingDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDraft
    /* Se mezcla contra el vacío para tolerar borradores de versiones viejas. */
    return { ...emptyDraft, ...(JSON.parse(raw) as Partial<ListingDraft>) }
  } catch {
    return emptyDraft
  }
}

/** Los datos de un aviso existente, con la forma que espera el formulario. */
export function draftFromVehicle(vehicle: Vehicle, whatsapp: string): ListingDraft {
  return {
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim ?? '',
    year: String(vehicle.year),
    condition: vehicle.condition,
    mileage: String(vehicle.mileage),
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    bodyType: vehicle.bodyType,
    drivetrain: vehicle.drivetrain,
    engine: vehicle.engine,
    doors: vehicle.doors ? String(vehicle.doors) : '',
    color: vehicle.color,
    price: String(vehicle.price),
    negotiable: vehicle.negotiable,
    city: vehicle.location.city,
    province: vehicle.location.province,
    description: vehicle.description,
    whatsapp,
  }
}

/**
 * @param persist Guardar en `localStorage`. Va en `false` al editar un aviso
 *   que ya existe: ese formulario arranca lleno con datos del servidor, y si
 *   además escribiera en el storage se llevaría puesto el borrador a medio
 *   hacer de una publicación nueva.
 */
export function useListingDraft({ persist = true }: { persist?: boolean } = {}) {
  const [draft, setDraft] = useState<ListingDraft>(() => (persist ? read() : emptyDraft))
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!persist) return

    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
        setSavedAt(new Date())
      } catch {
        /* Sin storage el borrador no persiste, pero el flujo sigue andando. */
      }
    }, 600)

    return () => clearTimeout(id)
  }, [draft, persist])

  const update = useCallback(<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  /* Cargar de una el formulario entero, para el modo edición. */
  const replace = useCallback((next: ListingDraft) => setDraft(next), [])

  const reset = useCallback(() => {
    setDraft(emptyDraft)
    if (!persist) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* Nada que limpiar. */
    }
  }, [persist])

  return { draft, update, replace, reset, savedAt }
}
