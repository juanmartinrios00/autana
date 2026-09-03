import { createContext } from 'react'

export interface FavoritesValue {
  ids: string[]
  has: (vehicleId: string) => boolean
  toggle: (vehicleId: string) => void
  clear: () => void
}

export const FavoritesContext = createContext<FavoritesValue | null>(null)
