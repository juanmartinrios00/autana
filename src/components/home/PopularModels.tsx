import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import './HomeSections.css'

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
      {models.map((item) => (
        <Link
          key={`${item.make}-${item.model}`}
          to={`/cars?make=${encodeURIComponent(item.make)}&model=${encodeURIComponent(item.model)}`}
          className="model"
        >
          <span className="model__make">{item.make}</span>
          <span className="model__name">{item.model}</span>
        </Link>
      ))}
    </Slider>
  )
}
