import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import mapSource from '../../assets/home/argentina-provinces.png'
import { Button } from '../ui/Button'
import './ProvinceMap.css'

interface Province {
  name: string
  query: string
  seed: [number, number]
}

/* Las semillas corresponden a una zona interior de cada provincia en el mapa
   provisto. El dibujo conserva así sus límites originales en vez de cubrirlo
   con una segunda silueta aproximada. */
const provinces: Province[] = [
  { name: 'Jujuy', query: 'Jujuy', seed: [546, 68] },
  { name: 'Salta', query: 'Salta', seed: [548, 136] },
  { name: 'Formosa', query: 'Formosa', seed: [688, 98] },
  { name: 'Chaco', query: 'Chaco', seed: [730, 210] },
  { name: 'Misiones', query: 'Misiones', seed: [897, 218] },
  { name: 'Corrientes', query: 'Corrientes', seed: [797, 286] },
  { name: 'Santiago del Estero', query: 'Santiago del Estero', seed: [634, 252] },
  { name: 'Tucumán', query: 'Tucumán', seed: [565, 229] },
  { name: 'Catamarca', query: 'Catamarca', seed: [516, 238] },
  { name: 'La Rioja', query: 'La Rioja', seed: [497, 324] },
  { name: 'San Juan', query: 'San Juan', seed: [450, 352] },
  { name: 'Córdoba', query: 'Córdoba', seed: [613, 389] },
  { name: 'Santa Fe', query: 'Santa Fe', seed: [701, 371] },
  { name: 'Entre Ríos', query: 'Entre Ríos', seed: [757, 417] },
  { name: 'Mendoza', query: 'Mendoza', seed: [454, 461] },
  { name: 'San Luis', query: 'San Luis', seed: [550, 456] },
  { name: 'Buenos Aires', query: 'Buenos Aires', seed: [690, 571] },
  { name: 'CABA', query: 'CABA', seed: [718, 548] },
  { name: 'La Pampa', query: 'La Pampa', seed: [540, 617] },
  { name: 'Neuquén', query: 'Neuquén', seed: [430, 662] },
  { name: 'Río Negro', query: 'Río Negro', seed: [493, 754] },
  { name: 'Chubut', query: 'Chubut', seed: [463, 866] },
  { name: 'Santa Cruz', query: 'Santa Cruz', seed: [447, 1040] },
  { name: 'Tierra del Fuego', query: 'Tierra del Fuego', seed: [500, 1200] },
]

const specialHitAreas = [
  { provinceIndex: 17, x: 772, y: 512, radius: 22 }, // CABA
]

interface ProvinceMapProps {
  counts: Record<string, number>
}

function countFor(counts: Record<string, number>, province: Province) {
  if (province.query === 'CABA') {
    return counts.CABA ?? counts['Ciudad Autónoma de Buenos Aires'] ?? 0
  }
  return counts[province.query] ?? 0
}

export function ProvinceMap({ counts }: ProvinceMapProps) {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<ImageData | null>(null)
  const labelsRef = useRef<Int16Array | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [ready, setReady] = useState(false)

  function paint(index: number | null) {
    const canvas = canvasRef.current
    const source = sourceRef.current
    const labels = labelsRef.current
    if (!canvas || !source || !labels) return
    const context = canvas.getContext('2d')
    if (!context) return

    const pixels = new Uint8ClampedArray(source.data)
    if (index !== null) {
      for (let pixel = 0; pixel < labels.length; pixel += 1) {
        if (labels[pixel] !== index) continue
        const offset = pixel * 4
        pixels[offset] = Math.round(pixels[offset] * 0.12 + 255 * 0.88)
        pixels[offset + 1] = Math.round(pixels[offset + 1] * 0.12 + 209 * 0.88)
        pixels[offset + 2] = Math.round(pixels[offset + 2] * 0.12)
      }
    }
    context.putImageData(new ImageData(pixels, source.width, source.height), 0, 0)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = new Image()

    image.onload = () => {
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      context.drawImage(image, 0, 0)

      const source = context.getImageData(0, 0, canvas.width, canvas.height)
      const labels = new Int16Array(canvas.width * canvas.height)
      labels.fill(-1)
      const queue = new Int32Array(labels.length)

      const canFill = (pixel: number) => {
        const offset = pixel * 4
        const alpha = source.data[offset + 3]
        const light = (source.data[offset] + source.data[offset + 1] + source.data[offset + 2]) / 3
        return alpha > 40 && light > 126
      }

      provinces.forEach((province, provinceIndex) => {
        const [seedX, seedY] = province.seed
        const seed = seedY * canvas.width + seedX
        if (!canFill(seed) || labels[seed] !== -1) return
        let head = 0
        let tail = 0
        queue[tail++] = seed
        labels[seed] = provinceIndex

        while (head < tail) {
          const pixel = queue[head++]
          const x = pixel % canvas.width
          const candidates = [pixel - canvas.width, pixel + canvas.width]
          if (x > 0) candidates.push(pixel - 1)
          if (x < canvas.width - 1) candidates.push(pixel + 1)

          for (const next of candidates) {
            if (next < 0 || next >= labels.length || labels[next] !== -1 || !canFill(next)) continue
            labels[next] = provinceIndex
            queue[tail++] = next
          }
        }
      })

      /* El PNG se usa para reconocer cada región, pero la capa visible se
         normaliza al lenguaje de Autana: masa negra y límites blancos. */
      const styledPixels = new Uint8ClampedArray(source.data)
      for (let pixel = 0; pixel < labels.length; pixel += 1) {
        const offset = pixel * 4
        if (styledPixels[offset + 3] <= 40) continue
        const light =
          (source.data[offset] + source.data[offset + 1] + source.data[offset + 2]) / 3
        const tone = light > 126 ? 12 : 255
        styledPixels[offset] = tone
        styledPixels[offset + 1] = tone
        styledPixels[offset + 2] = tone
      }
      const styledSource = new ImageData(styledPixels, source.width, source.height)
      sourceRef.current = styledSource
      labelsRef.current = labels
      context.putImageData(styledSource, 0, 0)
      setReady(true)
    }

    image.src = mapSource
    return () => {
      image.onload = null
    }
  }, [])

  function select(index: number | null, position: { x: number; y: number } | null = null) {
    if (index === selected && position === null) return
    setSelected(index)
    setTooltip(position)
    paint(index)
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const labels = labelsRef.current
    if (!canvas || !labels) return
    const bounds = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * canvas.width)))
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * canvas.height)))
    const special = specialHitAreas.find((area) => Math.hypot(x - area.x, y - area.y) <= area.radius)
    const index = special?.provinceIndex ?? labels[y * canvas.width + x]
    const next = index >= 0 ? index : null

    if (next !== selected) {
      setSelected(next)
      paint(next)
    }
    setTooltip(next === null ? null : { x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }

  const activeProvince = selected === null ? null : provinces[selected]

  return (
    <section className="province-map" aria-labelledby="province-map-title">
      <div className="province-map__content">
        <span className="over">Buscar por ubicación</span>
        <h2 id="province-map-title" className="province-map__title">
          Encontrá autos cerca tuyo.
        </h2>
        <p className="province-map__intro">
          Elegí una provincia para ver únicamente los vehículos publicados en esa zona.
        </p>

        <Link to="/cars" className="province-map__cta">
          <Button variant="yellow">Ver todos los vehículos</Button>
        </Link>

        <ul className="sr-only">
          {provinces.map((province, index) => (
            <li key={province.name}>
              <Link
                to={`/cars?province=${encodeURIComponent(province.query)}`}
                onPointerEnter={() => select(index)}
                onPointerLeave={() => select(null)}
                onFocus={() => select(index)}
                onBlur={() => select(null)}
              >
                {province.name}: {countFor(counts, province)} vehículos
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={`province-map__visual${ready ? ' province-map__visual--ready' : ''}`}>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          onPointerMove={onPointerMove}
          onPointerLeave={() => select(null)}
          onClick={() => {
            if (activeProvince) navigate(`/cars?province=${encodeURIComponent(activeProvince.query)}`)
          }}
        />
        {activeProvince && tooltip && (
          <div className="province-map__tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <strong>{activeProvince.name}</strong>
            <span>
              {countFor(counts, activeProvince)}{' '}
              {countFor(counts, activeProvince) === 1 ? 'vehículo publicado' : 'vehículos publicados'}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
