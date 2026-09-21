import { Link } from 'react-router-dom'
import { Slider } from '../ui/Slider'
import { bodyLabels, bodyTypes } from '../../lib/format'
import './HomeSections.css'

/**
 * Las fotos se levantan solas de `src/assets/carrocerias/<tipo>.webp`, que
 * prepara `npm run foto:carroceria` sacándoles el fondo. Sin foto, la caja
 * queda con el texto solo: la sección funciona completa igual, y mejora a
 * medida que aparecen, como los logos de las marcas.
 */
const photos = import.meta.glob('../../assets/carrocerias/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function photoFor(body: string): string | null {
  const match = Object.entries(photos).find(([path]) => path.endsWith(`/${body}.webp`))
  return match ? match[1] : null
}

export function CategorySlider({ counts }: { counts: Record<string, number> }) {
  return (
    <Slider
      eyebrow="Buscá por carrocería"
      title="Qué tipo de auto buscás"
      itemWidth="224px"
    >
      {bodyTypes.map((body) => {
        const count = counts[body] ?? 0
        const photo = photoFor(body)
        return (
          <Link key={body} to={`/autos?bodyType=${body}`} className="category">
            {/* Sin texto alternativo: el nombre de la carrocería está abajo, y
                anunciarla dos veces es ruido para quien usa lector de pantalla. */}
            {photo && (
              <img className="category__photo" src={photo} alt="" loading="lazy" decoding="async" />
            )}
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
