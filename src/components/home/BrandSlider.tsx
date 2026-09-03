import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import { brands } from '../../data/brands'
import './HomeSections.css'

/**
 * Los logos se levantan solos de `src/assets/brands/<slug>.(svg|png|webp)`.
 * Cuando el archivo no está, el círculo muestra la inicial de la marca: la
 * sección funciona completa desde el día uno y va mejorando a medida que
 * aparecen los logos, sin tocar código.
 */
const logos = import.meta.glob('../../assets/brands/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function logoFor(slug: string): string | null {
  const match = Object.entries(logos).find(([path]) => {
    const file = path.split('/').pop() ?? ''
    return file.replace(/\.(svg|png|webp)$/, '') === slug
  })
  return match ? match[1] : null
}

interface BrandSliderProps {
  /** Cuántas publicaciones activas hay por marca. */
  counts: Record<string, number>
}

export function BrandSlider({ counts }: BrandSliderProps) {
  return (
    <Slider
      eyebrow="Buscá por marca"
      title="Todas las marcas"
      action={{ label: 'Ver todos los autos', to: '/cars' }}
      itemWidth="112px"
    >
      {brands.map((brand) => {
        const logo = logoFor(brand.slug)
        const count = counts[brand.name] ?? 0

        return (
          <Link
            key={brand.slug}
            to={`/cars?make=${encodeURIComponent(brand.name)}`}
            className="brand"
          >
            <span className="brand__circle">
              {logo ? (
                <img src={logo} alt="" className="brand__logo" loading="lazy" />
              ) : (
                <span className="brand__initial" aria-hidden="true">
                  {brand.name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="brand__name">{brand.name}</span>
            <span className="brand__count mono">
              {count > 0 ? `${count} ${count === 1 ? 'auto' : 'autos'}` : 'Sin avisos'}
            </span>
          </Link>
        )
      })}
    </Slider>
  )
}
