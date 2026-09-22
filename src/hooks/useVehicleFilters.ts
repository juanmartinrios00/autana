import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { num, parseFilters, parseSort, type FilterChip } from '../lib/search-query'

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

export { activeChips, countActive, parseFilters } from '../lib/search-query'

export function useVehicleFilters() {
  const [params, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(params), [params])
  const sort = parseSort(params)
  const page = num(params, 'page') ?? 1

  /**
   * Escribe varios valores en una sola actualización, y vuelve a la página 1:
   * cambiar un filtro invalida el paginado.
   *
   * Tiene que ser una sola. Dos `setSearchParams` seguidos no se suman: el
   * segundo arranca de la URL de antes del primero y lo pisa. Así, elegir una
   * marca en el panel ---que escribía la marca y después borraba el modelo---
   * no hacía nada: el borrado del modelo reescribía la URL sin la marca. Estuvo
   * roto en producción sin que nadie lo notara.
   */
  const setParams = useCallback(
    (updates: Record<string, string | number | string[] | undefined>) => {
      const keys = Object.keys(updates)
      const paging = keys.length === 1 && keys[0] === 'page'
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(updates)) {
            const serialized = Array.isArray(value) ? value.join(',') : value?.toString()
            if (serialized === undefined || serialized === '') next.delete(key)
            else next.set(key, serialized)
          }
          if (!paging) next.delete('page')
          return next
        },
        { replace: true, preventScrollReset: !paging },
      )
    },
    [setSearchParams],
  )

  /** Un solo valor. Para más de uno a la vez, `setParams`. */
  const setParam = useCallback(
    (key: string, value: string | number | string[] | undefined) => setParams({ [key]: value }),
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
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  /** La × de un chip: saca ese valor de la lista, o la clave entera. */
  const removeChip = useCallback(
    (chip: FilterChip) => {
      if (chip.value) {
        toggleInList(chip.key, chip.value)
        return
      }
      /* Igual que en el panel: sin marca, el modelo no se puede elegir. */
      setParams(chip.key === 'make' ? { make: undefined, model: undefined } : { [chip.key]: undefined })
    },
    [setParams, toggleInList],
  )

  return { params, filters, sort, page, setParam, setParams, toggleInList, clearAll, removeChip }
}
