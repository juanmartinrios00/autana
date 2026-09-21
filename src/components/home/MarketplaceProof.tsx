import { BRAND } from '../../config/brand'
import { formatCount } from '../../lib/format'
import type { MarketplaceStats } from '../../lib/api'
import './MarketplaceProof.css'

interface MarketplaceProofProps {
  stats: MarketplaceStats
}

/**
 * Desde cuántos avisos activos aparece la banda.
 *
 * Los números son de verdad y eso no se toca: si hay uno, dice uno. Lo que
 * cambia es cuándo vale la pena decirlos. "1 publicación activa, 1 marca, 1
 * provincia" es lo segundo que ve alguien que llega desde un video, y no le
 * cuenta que el sitio funciona: le cuenta que está vacío. Una banda de números
 * existe para impresionar, y hasta que los números impresionen conviene que no
 * esté ---la portada sin ella se lee terminada igual.
 *
 * Veinte porque ahí la fila de marcas y la de provincias ya dejan de decir uno
 * o dos. Es un criterio, no un cálculo: se cambia acá y en ningún otro lado.
 */
const MIN_LISTINGS = 20

const label = (value: number, singular: string, plural: string) =>
  `${value === 1 ? singular : plural} en ${BRAND}`

/**
 * La banda de números, a todo el ancho.
 *
 * Va pegada al hero y sin margen a los costados a propósito: es un corte de
 * color entre dos bloques de contenido, y una banda con aire alrededor deja de
 * cortar.
 *
 * Los números salen de la base, no de un archivo de constantes. Si hay una
 * publicación, dice una. Es la misma regla que sigue /agencias: un número
 * inflado en la portada se desmiente solo en cuanto alguien toca "ver todos".
 */
export function MarketplaceProof({ stats }: MarketplaceProofProps) {
  if (stats.listings < MIN_LISTINGS) return null

  const items = [
    {
      value: formatCount(stats.listings),
      description: label(stats.listings, 'publicación activa', 'publicaciones activas'),
    },
    {
      value: formatCount(stats.makes),
      description: label(stats.makes, 'marca disponible', 'marcas disponibles'),
    },
    {
      value: formatCount(stats.provinces),
      description: label(stats.provinces, 'provincia representada', 'provincias representadas'),
    },
    {
      value: '0%',
      description: 'comisión por vender tu vehículo',
    },
  ]

  return (
    <section className="proof" aria-label="Datos del marketplace">
      <div className="proof__band">
        {items.map((item) => (
          <article className="proof__cell" key={item.description}>
            <strong className="proof__value">{item.value}</strong>
            <span className="proof__label">{item.description}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
