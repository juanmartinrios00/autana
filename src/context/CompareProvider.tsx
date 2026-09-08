import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CompareContext, MAX_COMPARE, type CompareValue } from './compare-context'

const STORAGE_KEY = 'autana:compare'

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((slug): slug is string => typeof slug === 'string').slice(0, MAX_COMPARE)
  } catch {
    return []
  }
}

/**
 * La selección para comparar.
 *
 * Vive en el navegador y no en la cuenta a propósito: es una decisión de un
 * rato, no algo que uno quiera encontrar la semana que viene. Los favoritos
 * son la lista que se guarda; esto es el changuito.
 *
 * La comparación en sí no se guarda acá: va en la URL de `/compare`, que es lo
 * que la hace compartible. Este provider sólo arma esa URL.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
    } catch {
      /* Sin storage la selección dura lo que dure la pestaña, y está bien. */
    }
  }, [slugs])

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs])

  const toggle = useCallback((slug: string) => {
    setSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug)
      /* Al llegar al tope no se pisa nada en silencio: el botón ya viene
         deshabilitado, así que esto es sólo un cinturón de seguridad. */
      if (current.length >= MAX_COMPARE) return current
      return [...current, slug]
    })
  }, [])

  const remove = useCallback((slug: string) => {
    setSlugs((current) => current.filter((item) => item !== slug))
  }, [])

  const clear = useCallback(() => setSlugs([]), [])

  const value = useMemo<CompareValue>(
    () => ({ slugs, has, toggle, remove, clear, full: slugs.length >= MAX_COMPARE }),
    [slugs, has, toggle, remove, clear],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}
