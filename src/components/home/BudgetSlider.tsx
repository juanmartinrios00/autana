import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import './HomeSections.css'

/** Tramos pensados para el mercado local, en dólares. */
const budgets = [
  { label: 'Hasta USD 8.000', query: 'maxPrice=8000' },
  { label: 'USD 8.000 a 15.000', query: 'minPrice=8000&maxPrice=15000' },
  { label: 'USD 15.000 a 25.000', query: 'minPrice=15000&maxPrice=25000' },
  { label: 'USD 25.000 a 40.000', query: 'minPrice=25000&maxPrice=40000' },
  { label: 'Más de USD 40.000', query: 'minPrice=40000' },
]

export function BudgetSlider() {
  return (
    <Slider eyebrow="Buscá por presupuesto" title="Cuánto querés gastar" itemWidth="240px">
      {budgets.map((budget) => (
        <Link key={budget.query} to={`/cars?${budget.query}`} className="budget">
          <span className="budget__label">{budget.label}</span>
          <span className="budget__cta">Ver autos</span>
        </Link>
      ))}
    </Slider>
  )
}
