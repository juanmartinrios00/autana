import { useEffect, useState } from 'react'
import { FilterPanel } from '../components/search/FilterPanel'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { VehicleGrid } from '../components/vehicle/VehicleGrid'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { countActive, useVehicleFilters } from '../hooks/useVehicleFilters'
import { listMakes, listModels, listProvinces, listVehicles } from '../lib/api'
import { formatCount } from '../lib/format'
import type { Paginated, SortOption, Vehicle } from '../types'
import './Cars.css'

const PAGE_SIZE = 12

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: menor primero' },
  { value: 'price-desc', label: 'Precio: mayor primero' },
  { value: 'year-desc', label: 'Año: más nuevo' },
  { value: 'mileage-asc', label: 'Kilometraje: menor' },
]

type Status = 'loading' | 'ready' | 'error'

export function Cars() {
  const { filters, sort, page, setParam, toggleInList, clearAll } = useVehicleFilters()

  /* Identidad de la búsqueda actual. Comparar esto con la búsqueda que ya
     respondió es lo que dice si estamos cargando, sin un setState extra. */
  const requestKey = JSON.stringify({ filters, sort, page })

  const [answer, setAnswer] = useState<{
    key: string
    data: Paginated<Vehicle> | null
    failed: boolean
  }>({ key: '', data: null, failed: false })

  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [sheetOpen, setSheetOpen] = useState(false)

  const [makes, setMakes] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [modelsByMake, setModelsByMake] = useState<Record<string, string[]>>({})

  useEffect(() => {
    void listMakes().then(setMakes)
    void listProvinces().then(setProvinces)
  }, [])

  useEffect(() => {
    const make = filters.make
    if (!make || modelsByMake[make]) return
    void listModels(make).then((list) => {
      setModelsByMake((prev) => ({ ...prev, [make]: list }))
    })
  }, [filters.make, modelsByMake])

  useEffect(() => {
    let current = true

    listVehicles({ filters, sort, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (current) setAnswer({ key: requestKey, data, failed: false })
      })
      .catch(() => {
        if (current) setAnswer({ key: requestKey, data: null, failed: true })
      })

    /* La búsqueda anterior puede resolver después de que cambiaron los filtros:
       sin esta bandera pintaría resultados viejos. */
    return () => {
      current = false
    }
  }, [requestKey, filters, sort, page])

  const status: Status =
    answer.key !== requestKey ? 'loading' : answer.failed ? 'error' : 'ready'
  const result = answer.data
  const models = filters.make ? (modelsByMake[filters.make] ?? []) : []

  const activeCount = countActive(filters)
  const total = result?.total ?? 0

  /* El título sigue a la búsqueda: una pestaña con diez listados abiertos
     tiene que dejar distinguir cuál es cuál. */
  useDocumentMeta({
    title: [filters.q, filters.make, filters.model].filter(Boolean).join(' ')
      ? `${[filters.q, filters.make, filters.model].filter(Boolean).join(' ')} | Autana`
      : 'Autos usados y 0 km | Autana',
    description:
      'Buscá entre los vehículos publicados por particulares y concesionarias. Filtrá por marca, precio, kilometraje y ubicación.',
  })
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const panel = (
    <FilterPanel
      filters={filters}
      setParam={setParam}
      toggleInList={toggleInList}
      clearAll={clearAll}
      makes={makes}
      models={models}
      provinces={provinces}
      activeCount={activeCount}
    />
  )

  return (
    <div className="page cars">
      <aside className={sheetOpen ? 'cars__aside is-open' : 'cars__aside'} aria-label="Filtros">
        {sheetOpen ? (
          <>
            <button
              type="button"
              className="sheet__scrim"
              aria-label="Cerrar filtros"
              onClick={() => setSheetOpen(false)}
            />
            <div className="sheet" role="dialog" aria-modal="true" aria-label="Filtros">
              <span className="sheet__grip" aria-hidden="true" />
              <div className="sheet__body">{panel}</div>
              <div className="sheet__foot">
                <Button variant="yellow" size="lg" block onClick={() => setSheetOpen(false)}>
                  Ver {formatCount(total)} {total === 1 ? 'auto' : 'autos'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          panel
        )}
      </aside>

      <main className="cars__results">
        <div className="cars__head">
          <div>
            <h1 className="cars__count">
              {status === 'loading'
                ? 'Buscando…'
                : `${formatCount(total)} ${total === 1 ? 'vehículo' : 'vehículos'}`}
            </h1>
            <p className="cars__summary">
              {activeCount === 0
                ? 'Todas las publicaciones activas'
                : `${activeCount} ${activeCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}`}
            </p>
          </div>

          <div className="cars__tools">
            <Button
              variant="outline"
              size="sm"
              className="cars__filters-trigger"
              onClick={() => setSheetOpen(true)}
            >
              <Icon name="list" size={15} />
              Filtros
              {activeCount > 0 && <Badge tone="accent">{activeCount}</Badge>}
            </Button>

            <Select
              label="Ordenar por"
              hideLabel
              className="cars__sort"
              options={sortOptions}
              value={sort}
              onChange={(event) => setParam('sort', event.target.value)}
            />

            <div className="view-toggle" role="group" aria-label="Formato de la lista">
              <button
                type="button"
                className={layout === 'grid' ? 'view-toggle__item is-on' : 'view-toggle__item'}
                aria-pressed={layout === 'grid'}
                aria-label="Ver en grilla"
                onClick={() => setLayout('grid')}
              >
                <Icon name="grid" size={15} />
              </button>
              <button
                type="button"
                className={layout === 'list' ? 'view-toggle__item is-on' : 'view-toggle__item'}
                aria-pressed={layout === 'list'}
                aria-label="Ver en lista"
                onClick={() => setLayout('list')}
              >
                <Icon name="list" size={15} />
              </button>
            </div>
          </div>
        </div>

        {status === 'error' && (
          <EmptyState
            tone="error"
            icon="close"
            title="Algo salió mal"
            description="No pudimos cargar los resultados. Revisá tu conexión e intentá de nuevo."
            action={
              <Button variant="outline" onClick={() => setParam('page', page)}>
                Reintentar
              </Button>
            }
          />
        )}

        {status !== 'error' && (status === 'loading' || total > 0) && (
          <VehicleGrid
            vehicles={result?.items ?? []}
            layout={layout}
            loading={status === 'loading'}
            skeletonCount={PAGE_SIZE}
          />
        )}

        {status === 'ready' && total === 0 && (
          <EmptyState
            title="No encontramos autos"
            description="Probá ampliar el rango de precio o quitar alguno de los filtros activos."
            action={
              <Button variant="yellow" onClick={clearAll}>
                Limpiar filtros
              </Button>
            }
          />
        )}

        {status === 'ready' && pageCount > 1 && (
          <nav className="pagination" aria-label="Paginación de resultados">
            <span className="pagination__info">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de{' '}
              {formatCount(total)}
            </span>
            <div className="pagination__pages">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={number === page ? 'pagination__page is-on' : 'pagination__page'}
                  aria-current={number === page ? 'page' : undefined}
                  onClick={() => setParam('page', number)}
                >
                  {number}
                </button>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  )
}
