import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { VehicleMedia } from '../components/vehicle/VehicleMedia'
import { useCompare } from '../hooks/useCompare'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getVehiclesBySlugs } from '../lib/api'
import {
  bodyLabels,
  conditionLabels,
  drivetrainLabels,
  formatMileage,
  formatPrice,
  fuelLabels,
  locationLabel,
  sellerTypeLabels,
  transmissionLabels,
  vehicleTitle,
} from '../lib/format'
import type { Vehicle } from '../types'
import './Compare.css'

/**
 * Comparar autos lado a lado.
 *
 * La selección vive en la URL —`/compare?ids=slug-a,slug-b`— y no en el
 * estado: comparar es justo lo que uno quiere mandarle a alguien para que
 * opine, y así compartirlo es copiar el link. Es la misma decisión que en los
 * filtros de `/cars`.
 */

/** Una fila de la tabla. `best` dice qué valor gana, cuando hay uno objetivo. */
interface Row {
  label: string
  value: (vehicle: Vehicle) => string
  /** `min` gana el más chico, `max` el más grande. Sin esto no se destaca. */
  best?: 'min' | 'max'
  score?: (vehicle: Vehicle) => number
  /** Cuándo la fila se puede comparar. Sin esto, siempre se puede. */
  comparable?: (vehicles: Vehicle[]) => boolean
}

const rows: Row[] = [
  {
    label: 'Precio',
    value: (v) => formatPrice(v.price, v.currency),
    best: 'min',
    score: (v) => v.price,
    /* Un aviso en pesos y otro en dólares no se comparan por el número: 7.000
       y 5.000.000 no dicen cuál es más barato. Mientras no haya cotización,
       con monedas distintas no se marca ninguno. */
    comparable: (list) => new Set(list.map((vehicle) => vehicle.currency)).size === 1,
  },
  { label: 'Año', value: (v) => String(v.year), best: 'max', score: (v) => v.year },
  {
    label: 'Kilometraje',
    value: (v) => formatMileage(v.mileage),
    best: 'min',
    score: (v) => v.mileage,
  },
  { label: 'Condición', value: (v) => conditionLabels[v.condition] },
  { label: 'Motor', value: (v) => v.engine || '—' },
  { label: 'Potencia', value: (v) => (v.power === null ? '—' : `${v.power} cv`) },
  { label: 'Combustible', value: (v) => fuelLabels[v.fuelType] },
  { label: 'Transmisión', value: (v) => transmissionLabels[v.transmission] },
  { label: 'Tracción', value: (v) => drivetrainLabels[v.drivetrain] },
  { label: 'Carrocería', value: (v) => bodyLabels[v.bodyType] },
  { label: 'Puertas', value: (v) => String(v.doors) },
  { label: 'Color', value: (v) => v.color || '—' },
  { label: 'Ubicación', value: (v) => locationLabel(v.location) },
  { label: 'Vendedor', value: (v) => (v.sellerType ? sellerTypeLabels[v.sellerType] : '—') },
]

/**
 * Los índices que ganan una fila.
 *
 * Devuelve un conjunto y no un índice porque un empate no tiene ganador: si
 * dos autos salen lo mismo, marcar sólo al primero sería inventar una
 * diferencia que no existe. Y si todos empatan no se marca ninguno.
 */
function winners(vehicles: Vehicle[], row: Row): Set<number> {
  if (!row.best || !row.score || vehicles.length < 2) return new Set()
  if (row.comparable && !row.comparable(vehicles)) return new Set()

  const scores = vehicles.map(row.score)
  const target = row.best === 'min' ? Math.min(...scores) : Math.max(...scores)
  if (scores.every((score) => score === target)) return new Set()

  return new Set(scores.flatMap((score, index) => (score === target ? [index] : [])))
}

export function Compare() {
  const [params, setParams] = useSearchParams()
  const { remove: removeFromSelection } = useCompare()

  const ids = params.get('ids') ?? ''

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  useDocumentMeta({
    title: 'Comparar autos | Autana',
    description: 'Compará hasta tres autos lado a lado: precio, kilometraje, motor y equipamiento.',
  })

  useEffect(() => {
    let current = true
    const slugs = ids ? ids.split(',').filter(Boolean) : []

    void getVehiclesBySlugs(slugs)
      .then((found) => {
        if (!current) return
        /* Se respeta el orden del link, que `in(...)` no garantiza. */
        const bySlug = new Map(found.map((vehicle) => [vehicle.slug, vehicle]))
        setVehicles(slugs.map((slug) => bySlug.get(slug)).filter((v): v is Vehicle => Boolean(v)))
      })
      .catch((cause) => {
        if (!current) return
        console.error('getVehiclesBySlugs', cause)
        setVehicles([])
      })
      .finally(() => {
        if (current) setLoadedFor(ids)
      })

    return () => {
      current = false
    }
  }, [ids])

  const loading = loadedFor !== ids

  /* Sacar una columna reescribe la URL, que es la fuente de verdad, y de paso
     la saca del changuito para que las dos vistas no se contradigan. */
  function drop(slug: string) {
    const left = vehicles.filter((vehicle) => vehicle.slug !== slug).map((vehicle) => vehicle.slug)
    removeFromSelection(slug)
    setParams(left.length > 0 ? { ids: left.join(',') } : {}, { replace: true })
  }

  if (loading) {
    return (
      <div className="page section">
        <Skeleton height="420px" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="page section">
        <EmptyState
          icon="grid"
          title="No hay autos para comparar"
          description="Entrá al listado y tocá “Comparar” en los que te interesen. Podés elegir hasta tres."
          action={
            <Link to="/cars">
              <Button variant="yellow">Ver los autos publicados</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="page section compare">
      <header className="compare__head">
        <div>
          <h1 className="compare__title">Comparar</h1>
          <p className="compare__lead">
            {vehicles.length === 1
              ? 'Sumá otro auto desde el listado para verlos lado a lado.'
              : 'Lo mejor de cada fila va marcado en amarillo. Este link se puede compartir.'}
          </p>
        </div>
        <Link to="/cars">
          <Button size="sm">Sumar otro auto</Button>
        </Link>
      </header>

      {/* La tabla scrollea sola en pantallas angostas en vez de romper la
          grilla de la página. */}
      <div className="compare__scroll">
        <table className="compare__table">
          <caption className="sr-only">Comparación de vehículos</caption>
          <thead>
            <tr>
              <th scope="col" className="compare__corner">
                <span className="sr-only">Característica</span>
              </th>
              {vehicles.map((vehicle) => (
                <th scope="col" key={vehicle.slug} className="compare__col">
                  <div className="compare__card">
                    <button
                      type="button"
                      className="compare__drop"
                      onClick={() => drop(vehicle.slug)}
                      aria-label={`Sacar ${vehicleTitle(vehicle)} de la comparación`}
                    >
                      <Icon name="close" size={14} />
                    </button>

                    <div className="compare__media">
                      <VehicleMedia vehicle={vehicle} />
                    </div>

                    <Link to={`/cars/${vehicle.slug}`} className="compare__name">
                      {vehicleTitle(vehicle)}
                    </Link>

                    {vehicle.sellerLevel && vehicle.sellerLevel.level > 1 && (
                      <Badge tone="tint">{vehicle.sellerLevel.title}</Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const best = winners(vehicles, row)
              return (
                <tr key={row.label}>
                  <th scope="row" className="compare__label">
                    {row.label}
                  </th>
                  {vehicles.map((vehicle, index) => (
                    <td
                      key={vehicle.slug}
                      className={best.has(index) ? 'compare__cell is-best mono' : 'compare__cell mono'}
                    >
                      {row.value(vehicle)}
                      {best.has(index) && <span className="sr-only"> (el mejor de la fila)</span>}
                    </td>
                  ))}
                </tr>
              )
            })}

            <tr>
              <th scope="row" className="compare__label">
                Ver
              </th>
              {vehicles.map((vehicle) => (
                <td key={vehicle.slug} className="compare__cell">
                  <Link to={`/cars/${vehicle.slug}`}>
                    <Button size="sm" variant="yellow">
                      Ver la ficha
                    </Button>
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
