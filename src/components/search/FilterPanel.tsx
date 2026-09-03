import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import {
  bodyLabels,
  conditionLabels,
  fuelLabels,
  sellerTypeLabels,
  transmissionLabels,
} from '../../lib/format'
import type { useVehicleFilters } from '../../hooks/useVehicleFilters'
import type { BodyType, FuelType, Transmission, VehicleCondition } from '../../types'
import './FilterPanel.css'

type FilterState = ReturnType<typeof useVehicleFilters>

interface FilterPanelProps extends Pick<FilterState, 'filters' | 'setParam' | 'toggleInList' | 'clearAll'> {
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
              <Badge tone={on ? 'tint' : 'outline'} className="filters__chip">
                {labels[option]}
              </Badge>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const FUELS: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric', 'gnc']
const BODIES: BodyType[] = ['sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van']
const CONDITIONS: VehicleCondition[] = ['new', 'used', 'certified']
const TRANSMISSIONS: Transmission[] = ['manual', 'automatic', 'cvt']

export function FilterPanel({
  filters,
  setParam,
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
        onChange={(event) => {
          setParam('make', event.target.value || undefined)
          setParam('model', undefined)
        }}
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
        <legend className="field__label">Precio (USD)</legend>
        <div className="filters__pair">
          <Input
            label="Desde"
            hideLabel
            type="number"
            inputMode="numeric"
            placeholder="Desde"
            value={filters.minPrice ?? ''}
            onChange={(event) => setParam('minPrice', event.target.value || undefined)}
          />
          <Input
            label="Hasta"
            hideLabel
            type="number"
            inputMode="numeric"
            placeholder="Hasta"
            value={filters.maxPrice ?? ''}
            onChange={(event) => setParam('maxPrice', event.target.value || undefined)}
          />
        </div>
      </fieldset>

      <fieldset className="filters__group">
        <legend className="field__label">Año</legend>
        <div className="filters__pair">
          <Input
            label="Desde"
            hideLabel
            type="number"
            inputMode="numeric"
            placeholder="Desde"
            value={filters.minYear ?? ''}
            onChange={(event) => setParam('minYear', event.target.value || undefined)}
          />
          <Input
            label="Hasta"
            hideLabel
            type="number"
            inputMode="numeric"
            placeholder="Hasta"
            value={filters.maxYear ?? ''}
            onChange={(event) => setParam('maxYear', event.target.value || undefined)}
          />
        </div>
      </fieldset>

      <Input
        label="Kilometraje máximo"
        type="number"
        inputMode="numeric"
        placeholder="Sin tope"
        value={filters.maxMileage ?? ''}
        onChange={(event) => setParam('maxMileage', event.target.value || undefined)}
      />

      <hr className="rule" />

      <fieldset className="filters__group">
        <legend className="field__label">Transmisión</legend>
        <div className="segmented">
          <button
            type="button"
            className={!filters.transmission ? 'segmented__item is-on' : 'segmented__item'}
            aria-pressed={!filters.transmission}
            onClick={() => setParam('transmission', undefined)}
          >
            Todas
          </button>
          {TRANSMISSIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={
                filters.transmission === option ? 'segmented__item is-on' : 'segmented__item'
              }
              aria-pressed={filters.transmission === option}
              onClick={() => setParam('transmission', option)}
            >
              {transmissionLabels[option]}
            </button>
          ))}
        </div>
      </fieldset>

      <ChipGroup
        legend="Combustible"
        options={FUELS}
        labels={fuelLabels}
        selected={filters.fuelType}
        onToggle={(value) => toggleInList('fuelType', value)}
      />

      <ChipGroup
        legend="Carrocería"
        options={BODIES}
        labels={bodyLabels}
        selected={filters.bodyType}
        onToggle={(value) => toggleInList('bodyType', value)}
      />

      <ChipGroup
        legend="Condición"
        options={CONDITIONS}
        labels={conditionLabels}
        selected={filters.condition}
        onToggle={(value) => toggleInList('condition', value)}
      />

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
        options={(['dealer', 'private'] as const).map((type) => ({
          value: type,
          label: sellerTypeLabels[type],
        }))}
        value={filters.sellerType ?? ''}
        onChange={(event) => setParam('sellerType', event.target.value || undefined)}
      />
    </div>
  )
}
