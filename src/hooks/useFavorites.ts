import { useContext } from 'react'
import { FavoritesContext } from '../context/favorites-context'

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('useFavorites necesita estar dentro de <FavoritesProvider>')
  return value
}
