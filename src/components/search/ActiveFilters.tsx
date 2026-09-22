import { Icon } from '../ui/Icon'
import type { FilterChip } from '../../lib/search-query'
import './ActiveFilters.css'

/**
 * Los filtros puestos, arriba de los resultados, cada uno con su ×.
 *
 * Antes la pantalla decía "3 filtros aplicados" y nada más: en el celular, donde
 * el panel vive en una hoja que se abre aparte, para saber cuáles eran había
 * que abrirla. Y sacar uno era abrirla, encontrarlo y deshacerlo. El caso de
 * "no aparece nada" es justo cuando más falta: se ve qué está achicando la
 * búsqueda y se saca con un toque.
 */
export function ActiveFilters({
  chips,
  onRemove,
  onClear,
}: {
  chips: FilterChip[]
  onRemove: (chip: FilterChip) => void
  onClear: () => void
}) {
  if (chips.length === 0) return null

  return (
    <ul className="active-filters" aria-label="Filtros aplicados">
      {chips.map((chip) => (
        <li key={`${chip.key}:${chip.value ?? ''}`}>
          <button
            type="button"
            className="active-filters__chip"
            onClick={() => onRemove(chip)}
            aria-label={`Sacar el filtro ${chip.label}`}
          >
            {chip.label}
            <Icon name="close" size={13} />
          </button>
        </li>
      ))}
      {/* Con uno solo, su × ya es "limpiar todo". */}
      {chips.length > 1 && (
        <li>
          <button type="button" className="active-filters__clear" onClick={onClear}>
            Limpiar todo
          </button>
        </li>
      )}
    </ul>
  )
}
