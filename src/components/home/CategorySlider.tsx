import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import { bodyLabels } from '../../lib/format'
import type { BodyType } from '../../types'
import './HomeSections.css'

const order: BodyType[] = ['sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van']

export function CategorySlider({ counts }: { counts: Record<string, number> }) {
  return (
    <Slider
      eyebrow="Buscá por carrocería"
      title="Qué tipo de auto buscás"
      itemWidth="200px"
    >
      {order.map((body) => {
        const count = counts[body] ?? 0
        return (
          <Link key={body} to={`/cars?bodyType=${body}`} className="category">
            <span className="category__name">{bodyLabels[body]}</span>
            <span className="category__count mono">
              {count > 0 ? `${count} ${count === 1 ? 'auto' : 'autos'}` : 'Sin avisos'}
            </span>
          </Link>
        )
      })}
    </Slider>
  )
}
