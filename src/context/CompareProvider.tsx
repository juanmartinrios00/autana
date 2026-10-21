import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { slugTitle } from '../lib/format'
import { CompareContext, MAX_COMPARE, type CompareValue } from './compare-context'

const STORAGE_KEY = 'autana:compare'

/**
 * Cada auto elegido con el nombre que tenía la card al elegirlo.
 *
 * Antes se guardaba sólo el slug y la barra sacaba el nombre de ahí, pero el
 * slug se arma al publicar y no cambia más: un aviso al que después le
 * corrigieron el año seguía diciendo el año viejo en la barra ---"Renault
 * Symbol 2010" para un 2012---. El nombre puede faltar en lo guardado antes de
 * este cambio, que era una lista de slugs sueltos.
 */
interface Pick {
  slug: string
  name?: string
}

function read(): Pick[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): Pick | null => {
        if (typeof item === 'string') return { slug: item }
        if (item && typeof item === 'object' && typeof item.slug === 'string') {
          return { slug: item.slug, name: typeof item.name === 'string' ? item.name : undefined }
        }
        return null
      })
      .filter((item): item is Pick => item !== null)
      .slice(0, MAX_COMPARE)
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
 * La comparación en sí no se guarda acá: va en la URL de `/comparar`, que es lo
 * que la hace compartible. Este provider sólo arma esa URL.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [picks, setPicks] = useState<Pick[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks))
    } catch {
      /* Sin storage la selección dura lo que dure la pestaña, y está bien. */
    }
  }, [picks])

  const slugs = useMemo(() => picks.map((item) => item.slug), [picks])

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs])

  const nameOf = useCallback(
    (slug: string) => picks.find((item) => item.slug === slug)?.name ?? slugTitle(slug),
    [picks],
  )

  const toggle = useCallback((slug: string, name: string) => {
    setPicks((current) => {
      if (current.some((item) => item.slug === slug)) return current.filter((item) => item.slug !== slug)
      /* Al llegar al tope no se pisa nada en silencio: el botón ya viene
         deshabilitado, así que esto es sólo un cinturón de seguridad. */
      if (current.length >= MAX_COMPARE) return current
      return [...current, { slug, name }]
    })
  }, [])

  const remove = useCallback((slug: string) => {
    setPicks((current) => current.filter((item) => item.slug !== slug))
  }, [])

  const clear = useCallback(() => setPicks([]), [])

  const value = useMemo<CompareValue>(
    () => ({ slugs, has, nameOf, toggle, remove, clear, full: slugs.length >= MAX_COMPARE }),
    [slugs, has, nameOf, toggle, remove, clear],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}
