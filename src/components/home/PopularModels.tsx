import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import './HomeSections.css'

const logos = import.meta.glob('../../assets/brands/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function logoFor(make: string): string | null {
  const slug = make.toLowerCase().replace(/\s+/g, '-')
  const match = Object.entries(logos).find(([path]) => {
    const file = path.split('/').pop() ?? ''
    return file.replace(/\.(svg|png|webp)$/, '') === slug
  })
  return match ? match[1] : null
}

/**
 * Modelos que la gente busca en el mercado local. Son atajos a una búsqueda,
 * no publicaciones: si no hay stock de alguno, el listado muestra su empty
 * state y ofrece limpiar filtros.
 */
const models = [
  { make: 'Toyota', model: 'Corolla' },
  { make: 'Volkswagen', model: 'Amarok' },
  { make: 'Toyota', model: 'Hilux' },
  { make: 'Ford', model: 'Ranger' },
  { make: 'Volkswagen', model: 'Gol' },
  { make: 'Chevrolet', model: 'Cruze' },
  { make: 'Renault', model: 'Sandero' },
  { make: 'Fiat', model: 'Cronos' },
  { make: 'Peugeot', model: '208' },
  { make: 'Honda', model: 'Civic' },
  { make: 'Jeep', model: 'Renegade' },
  { make: 'Ford', model: 'EcoSport' },
]

export function PopularModels() {
  return (
    <Slider eyebrow="Lo que más se busca" title="Modelos más buscados" itemWidth="212px">
      {models.map((item) => {
        const logo = logoFor(item.make)

        return (
          <Link
            key={`${item.make}-${item.model}`}
            to={`/cars?make=${encodeURIComponent(item.make)}&model=${encodeURIComponent(item.model)}`}
            className="model"
          >
            <span className="model__copy">
              <span className="model__make">{item.make}</span>
              <span className="model__name">{item.model}</span>
            </span>
            {logo && <img src={logo} alt="" className="model__logo" loading="lazy" />}
          </Link>
        )
      })}
    </Slider>
  )
}
