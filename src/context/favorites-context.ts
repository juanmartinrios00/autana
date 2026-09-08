import { createContext } from 'react'

export interface FavoritesValue {
  ids: string[]
  has: (vehicleId: string) => boolean
  toggle: (vehicleId: string) => void
  clear: () => void
  /** Mientras se traen los favoritos de la cuenta. */
  loading: boolean
  /** Último error de sincronización, para poder decirlo en pantalla. */
  failure: string | null
  /** `true` cuando la lista vive en la cuenta y no sólo en este navegador. */
  synced: boolean
}

export const FavoritesContext = createContext<FavoritesValue | null>(null)
