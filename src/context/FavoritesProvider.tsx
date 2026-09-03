import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FavoritesContext, type FavoritesValue } from './favorites-context'

const STORAGE_KEY = 'autana:favorites'

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    /* Ventana privada, storage bloqueado: se arranca sin favoritos. */
    return []
  }
}

/**
 * Provisorio: los favoritos viven en el navegador. Cuando exista la cuenta de
 * usuario pasan al backend y este provider se convierte en la capa de caché.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      /* No poder persistir no debe romper la navegación. */
    }
  }, [ids])

  const has = useCallback((vehicleId: string) => ids.includes(vehicleId), [ids])

  const toggle = useCallback((vehicleId: string) => {
    setIds((prev) =>
      prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId],
    )
  }, [])

  const clear = useCallback(() => setIds([]), [])

  const value = useMemo<FavoritesValue>(() => ({ ids, has, toggle, clear }), [ids, has, toggle, clear])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
