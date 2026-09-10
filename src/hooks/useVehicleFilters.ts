import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { num, parseFilters, parseSort } from '../lib/search-query'

/**
 * La query string es la única representación del estado de búsqueda.
 * Compartir una búsqueda es copiar el link, y una búsqueda guardada es
 * exactamente esta misma cadena.
 *
 * Leerla e interpretarla ya no vive acá: se mudó a `lib/search-query`, porque
 * el trabajo que avisa por mail las búsquedas guardadas tiene que entenderla
 * igual y corre en el worker, sin React. Acá queda sólo lo que es de React:
 * suscribirse a los parámetros y escribirlos.
 */

export { countActive, parseFilters } from '../lib/search-query'

export function useVehicleFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(params), [params])
  const sort = parseSort(params)
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
