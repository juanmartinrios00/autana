import { useCallback, useEffect, useState } from 'react'
import type { BodyType, Drivetrain, FuelType, Transmission, VehicleCondition } from '../types'

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

export function useListingDraft() {
  const [draft, setDraft] = useState<ListingDraft>(read)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
        setSavedAt(new Date())
      } catch {
        /* Sin storage el borrador no persiste, pero el flujo sigue andando. */
      }
    }, 600)

    return () => clearTimeout(id)
  }, [draft])

  const update = useCallback(<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setDraft(emptyDraft)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* Nada que limpiar. */
    }
  }, [])

  return { draft, update, reset, savedAt }
}
