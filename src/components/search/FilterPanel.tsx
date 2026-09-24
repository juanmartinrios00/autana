import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { AmountInput } from '../ui/AmountInput'
import { Select } from '../ui/Select'
import {
  bodyLabels,
  bodyTypes,
  currencies,
  conditionLabels,
  conditions,
  drivetrainLabels,
  drivetrains,
  fuelLabels,
  fuelTypes,
  sellerTypeLabels,
  sellerTypes,
  transmissionLabels,
  transmissions,
} from '../../lib/format'
import type { useVehicleFilters } from '../../hooks/useVehicleFilters'
import './FilterPanel.css'

type FilterState = ReturnType<typeof useVehicleFilters>

interface FilterPanelProps
  extends Pick<FilterState, 'filters' | 'setParam' | 'setParams' | 'toggleInList' | 'clearAll'> {
  makes: string[]
  models: string[]
  provinces: string[]
  activeCount: number
}

/** Grupo de opciones múltiples que se pintan como chips seleccionables. */
function ChipGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  selected: readonly T[] | undefined
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="filters__group">
      <legend className="field__label">{legend}</legend>
      <div className="filters__chips">
        {options.map((option) => {
          const on = selected?.includes(option) ?? false
          return (
            <button
              key={option}
              type="button"
              className="chip-button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
            >
              <Badge className={on ? 'filters__chip is-on' : 'filters__chip'}>
                {on && <Icon name="check" size={13} strokeWidth={2} />}
                {labels[option]}
              </Badge>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function FilterPanel({
  filters,
  setParam,
  setParams,
  toggleInList,
  clearAll,
  makes,
  models,
  provinces,
  activeCount,
}: FilterPanelProps) {
  return (
    <div className="filters">
      <div className="filters__head">
        <h2 className="filters__title">Filtros</h2>
        {activeCount > 0 && (
          <div className="filters__head-actions">
            <Badge tone="tint">
              {activeCount} {activeCount === 1 ? 'activo' : 'activos'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpiar
            </Button>
          </div>
        )}
      </div>

      <Select
        label="Marca"
        placeholder="Todas"
        options={makes.map((make) => ({ value: make, label: make }))}
        value={filters.make ?? ''}
        /* Las dos juntas: ver `setParams`. */
        onChange={(event) => setParams({ make: event.target.value || undefined, model: undefined })}
      />

      <Select
        label="Modelo"
        placeholder={filters.make ? 'Todos' : 'Elegí una marca primero'}
        options={models.map((model) => ({ value: model, label: model }))}
        value={filters.model ?? ''}
        disabled={!filters.make}
        onChange={(event) => setParam('model', event.target.value || undefined)}
      />

      <fieldset className="filters__group">
        {/* La moneda es parte del tope, no un filtro aparte: los mismos 30.000
            son un auto usado en dólares y nada en pesos, así que el número no
            quiere decir nada hasta que se sepa en cuál está. Por eso va acá
            arriba y no en la lista de filtros de abajo. */}
        <legend className="field__label">Precio</legend>
        <div className="filters__currency" role="radiogroup" aria-label="Moneda del precio">
          {currencies.map((value) => {
            const on = (filters.currency ?? 'USD') === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                className={on ? 'filters__money is-on' : 'filters__money'}
                onClick={() => setParam('currency', value === 'USD' ? undefined : value)}
              >
                {value}
              </button>
            )
          })}
        </div>
        <div className="filters__pair">
          <AmountInput
            label="Desde"
            hideLabel
            placeholder="Desde"
            value={filters.minPrice === undefined ? '' : String(filters.minPrice)}
            onValueChange={(value) => setParam('minPrice', value || undefined)}
          />
          <AmountInput
            label="Hasta"
            hideLabel
            placeholder="Hasta"
            value={filters.maxPrice === undefined ? '' : String(filters.maxPrice)}
            onValueChange={(value) => setParam('maxPrice', value || undefined)}
          />
        </div>
      </fieldset>

      <fieldset className="filters__group">
        <legend className="field__label">Año</legend>
        <div className="filters__pair">
          <AmountInput
            label="Desde"
            hideLabel
            agrupar={false}
            maxLength={4}
            placeholder="Desde"
            value={filters.minYear === undefined ? '' : String(filters.minYear)}
            onValueChange={(value) => setParam('minYear', value || undefined)}
          />
          <AmountInput
            label="Hasta"
            hideLabel
            agrupar={false}
            maxLength={4}
            placeholder="Hasta"
            value={filters.maxYear === undefined ? '' : String(filters.maxYear)}
            onValueChange={(value) => setParam('maxYear', value || undefined)}
          />
        </div>
      </fieldset>

      <AmountInput
        label="Kilometraje máximo"
        placeholder="Sin tope"
        value={filters.maxMileage === undefined ? '' : String(filters.maxMileage)}
        onValueChange={(value) => setParam('maxMileage', value || undefined)}
      />

      <hr className="rule" />

      <fieldset className="filters__group">
        <legend className="field__label">Transmisión</legend>
        {/* Chips como los demás grupos y no un control segmentado: con
            "Automática" y "CVT" no entraban las cuatro en el ancho del panel y
            la última quedaba cortada. Los chips bajan de renglón. */}
        <div className="filters__chips">
          {[undefined, ...transmissions].map((option) => {
            const on = filters.transmission === option
            return (
              <button
                key={option ?? 'todas'}
                type="button"
                className="chip-button"
                aria-pressed={on}
                onClick={() => setParam('transmission', option)}
              >
                <Badge className={on ? 'filters__chip is-on' : 'filters__chip'}>
                  {on && <Icon name="check" size={13} strokeWidth={2} />}
                  {option ? transmissionLabels[option] : 'Todas'}
                </Badge>
              </button>
            )
          })}
        </div>
      </fieldset>

      <ChipGroup
        legend="Tracción"
        options={drivetrains}
        labels={drivetrainLabels}
        selected={filters.drivetrain}
        onToggle={(value) => toggleInList('drivetrain', value)}
      />

      <ChipGroup
        legend="Combustible"
        options={fuelTypes}
        labels={fuelLabels}
        selected={filters.fuelType}
        onToggle={(value) => toggleInList('fuelType', value)}
      />

      <ChipGroup
        legend="Carrocería"
        options={bodyTypes}
        labels={bodyLabels}
        selected={filters.bodyType}
        onToggle={(value) => toggleInList('bodyType', value)}
      />

      <ChipGroup
        legend="Condición"
        options={conditions}
        labels={conditionLabels}
        selected={filters.condition}
        onToggle={(value) => toggleInList('condition', value)}
      />

      {/* Un interruptor y no un grupo: hay una sola opción que tenga sentido
          pedir. `negotiable=1` en la URL, como las demás claves. */}
      <fieldset className="filters__group">
        <legend className="field__label">Precio negociable</legend>
        <div className="filters__chips">
          <button
            type="button"
            className="chip-button"
            aria-pressed={Boolean(filters.negotiable)}
            onClick={() => setParam('negotiable', filters.negotiable ? undefined : '1')}
          >
            <Badge className={filters.negotiable ? 'filters__chip is-on' : 'filters__chip'}>
              {filters.negotiable && <Icon name="check" size={13} strokeWidth={2} />}
              Acepta ofertas
            </Badge>
          </button>
        </div>
      </fieldset>

      <Select
        label="Ubicación"
        placeholder="Todo el país"
        options={provinces.map((province) => ({ value: province, label: province }))}
        value={filters.province ?? ''}
        onChange={(event) => setParam('province', event.target.value || undefined)}
      />

      <Select
        label="Vendedor"
        placeholder="Todos"
        options={sellerTypes.map((type) => ({
          value: type,
          label: sellerTypeLabels[type],
        }))}
        value={filters.sellerType ?? ''}
        onChange={(event) => setParam('sellerType', event.target.value || undefined)}
      />
    </div>
  )
}
