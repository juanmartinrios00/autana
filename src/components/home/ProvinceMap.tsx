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
   con una segunda silueta aproximada.

   CABA no está: el mapa no la dibuja separada de Buenos Aires —ese sector es
   relleno continuo—, así que el relleno de Buenos Aires se la comía y su
   semilla nunca prendía. Quedaba un marcador que mostraba el globo pero no
   pintaba nada, y al pasarle por arriba Buenos Aires se apagaba. Esa zona es
   Buenos Aires y listo; a CABA se llega por el filtro de ubicación. */
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
  { name: 'La Pampa', query: 'La Pampa', seed: [540, 617] },
  { name: 'Neuquén', query: 'Neuquén', seed: [430, 662] },
  { name: 'Río Negro', query: 'Río Negro', seed: [493, 754] },
  { name: 'Chubut', query: 'Chubut', seed: [463, 866] },
  { name: 'Santa Cruz', query: 'Santa Cruz', seed: [447, 1040] },
  { name: 'Tierra del Fuego', query: 'Tierra del Fuego', seed: [500, 1200] },
]

interface ProvinceMapProps {
  counts: Record<string, number>
}

function countFor(counts: Record<string, number>, province: Province) {
  return counts[province.query] ?? 0
}

/**
 * Los píxeles de una provincia, con el rectángulo que los contiene.
 *
 * Se arma durante el relleno, que ya pasa por cada uno: guardarlos sale gratis
 * ahí y evita tener que buscarlos después. El rectángulo es para subir al
 * canvas sólo esa zona en vez de la lámina entera.
 */
interface Region {
  pixels: Int32Array
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function ProvinceMap({ counts }: ProvinceMapProps) {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** La lámina en blanco y negro, sin ninguna provincia encendida. Nunca se toca. */
  const cleanRef = useRef<ImageData | null>(null)
  /** Lo que está en pantalla. Es la que se modifica, siempre leyendo de `cleanRef`. */
  const frameRef = useRef<ImageData | null>(null)
  const labelsRef = useRef<Int16Array | null>(null)
  const regionsRef = useRef<(Region | null)[] | null>(null)
  /** Cuál quedó encendida, para saber qué apagar sin recorrer el resto. */
  const litRef = useRef<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [ready, setReady] = useState(false)

  /**
   * Enciende una provincia y apaga la anterior.
   *
   * Antes esto copiaba el buffer completo y recorría el millón y medio de
   * píxeles del mapa en cada cambio: seis megas y seis milisegundos por
   * provincia, en el hilo principal. Barrer el mapa de punta a punta con el
   * mouse tiraba ciento cuarenta megas al recolector.
   *
   * Ahora toca sólo la que se apaga y la que se enciende —unos quince mil
   * píxeles— y sube al canvas nada más que sus rectángulos. El color sale
   * siempre de `cleanRef`, así que encender dos veces la misma no la satura.
   */
  function paint(index: number | null) {
    const canvas = canvasRef.current
    const clean = cleanRef.current
    const frame = frameRef.current
    const regions = regionsRef.current
    if (!canvas || !clean || !frame || !regions) return
    const context = canvas.getContext('2d')
    if (!context) return
    if (litRef.current === index) return

    const blit = (region: Region) => {
      context.putImageData(
        frame,
        0,
        0,
        region.minX,
        region.minY,
        region.maxX - region.minX + 1,
        region.maxY - region.minY + 1,
      )
    }

    const previous = litRef.current === null ? null : regions[litRef.current]
    if (previous) {
      for (const pixel of previous.pixels) {
        const offset = pixel * 4
        frame.data[offset] = clean.data[offset]
        frame.data[offset + 1] = clean.data[offset + 1]
        frame.data[offset + 2] = clean.data[offset + 2]
      }
      blit(previous)
    }

    const region = index === null ? null : regions[index]
    if (region) {
      for (const pixel of region.pixels) {
        const offset = pixel * 4
        frame.data[offset] = Math.round(clean.data[offset] * 0.12 + 255 * 0.88)
        frame.data[offset + 1] = Math.round(clean.data[offset + 1] * 0.12 + 209 * 0.88)
        frame.data[offset + 2] = Math.round(clean.data[offset + 2] * 0.12)
      }
      blit(region)
    }

    litRef.current = index
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

      const regions: (Region | null)[] = provinces.map(() => null)

      provinces.forEach((province, provinceIndex) => {
        const [seedX, seedY] = province.seed
        const seed = seedY * canvas.width + seedX
        if (!canFill(seed) || labels[seed] !== -1) return
        let head = 0
        let tail = 0
        queue[tail++] = seed
        labels[seed] = provinceIndex

        let minX = seedX
        let maxX = seedX
        let minY = seedY
        let maxY = seedY

        while (head < tail) {
          const pixel = queue[head++]
          const x = pixel % canvas.width
          const y = (pixel - x) / canvas.width
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y

          const candidates = [pixel - canvas.width, pixel + canvas.width]
          if (x > 0) candidates.push(pixel - 1)
          if (x < canvas.width - 1) candidates.push(pixel + 1)

          for (const next of candidates) {
            if (next < 0 || next >= labels.length || labels[next] !== -1 || !canFill(next)) continue
            labels[next] = provinceIndex
            queue[tail++] = next
          }
        }

        /* La cola se reusa entre provincias, así que hay que llevarse una copia
           antes de que la pise la siguiente. */
        regions[provinceIndex] = { pixels: queue.slice(0, tail), minX, minY, maxX, maxY }
      })

      /* El PNG se usa para reconocer cada región, pero la capa visible se
         normaliza al lenguaje de Autana: masa gris y límites blancos.

         La masa era casi negra. Sobre una portada clara, un mapa negro es la
         mancha más pesada de la pantalla y se lleva la atención por tamaño y
         no por importancia. En gris sigue leyéndose la silueta del país, los
         límites blancos siguen cortando cada provincia, y el amarillo del
         hover pasa a ser lo único fuerte del bloque — que es de lo que se
         trata: lo que está encendido es lo que se está mirando.

         No es un gris cualquiera: es `--ink-4`, el mismo de la paleta, con su
         punta de verde. Un gris neutro al lado del resto se ve azulado. */
      const MASS: [number, number, number] = [105, 113, 108]
      const styledPixels = new Uint8ClampedArray(source.data)
      for (let pixel = 0; pixel < labels.length; pixel += 1) {
        const offset = pixel * 4
        if (styledPixels[offset + 3] <= 40) continue
        const light =
          (source.data[offset] + source.data[offset + 1] + source.data[offset + 2]) / 3
        /* Claro en el original es interior de provincia; oscuro es el trazo del
           límite, que va en blanco para separarlas. */
        const [r, g, b] = light > 126 ? MASS : [255, 255, 255]
        styledPixels[offset] = r
        styledPixels[offset + 1] = g
        styledPixels[offset + 2] = b
      }
      /* Dos copias: `clean` es de donde sale el color original de cada píxel y
         no se toca nunca; `frame` es la que se modifica y se sube al canvas.
         Separadas, porque encender leyendo de la que ya está encendida iría
         acumulando el tinte sobre sí mismo. */
      cleanRef.current = new ImageData(styledPixels, source.width, source.height)
      frameRef.current = new ImageData(
        new Uint8ClampedArray(styledPixels),
        source.width,
        source.height,
      )
      labelsRef.current = labels
      regionsRef.current = regions
      context.putImageData(frameRef.current, 0, 0)
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
    const index = labels[y * canvas.width + x]
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
