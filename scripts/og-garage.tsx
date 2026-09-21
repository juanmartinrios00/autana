/**
 * Genera `public/og-garage.png`: la imagen del preview de un garage que no
 * tiene ninguna foto.
 *
 *   npm run og:garage
 *
 * Por qué una imagen fija y no una por persona. Dibujar la de cada uno al
 * compartir pide un motor de SVG en WebAssembly y las tipografías dentro del
 * worker: unos 2,5 MB, contra un límite de 3 MB en el plan gratuito, y CPU en
 * cada preview. El título y la descripción del preview ya dicen el nombre y los
 * autos; la imagen tiene que decir "esto es un garage", y eso no cambia de una
 * persona a otra.
 *
 * Usa las escenas de verdad (`GarageScene`), así que si cambian los dibujos se
 * vuelve a correr esto y la imagen acompaña. Va con Vite en modo SSR porque las
 * escenas son componentes de React.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { GarageScene } from '../src/components/garage/scenes'
import type { GarageSlot } from '../src/types'
import { ACCENT, brandLockup, FONT, H, INK, W, writeLamina } from './og-base'

/* Los mismos autos de ejemplo que la sección del garage en la portada: un
   clásico con cromados, una camioneta, uno bajo y el que ya no está. */
const EXAMPLES: Record<GarageSlot, { make: string; model: string; year: number }> = {
  first: { make: 'Renault', model: '12', year: 1978 },
  current: { make: 'Toyota', model: 'Hilux', year: 2019 },
  dream: { make: 'Ford', model: 'Mustang', year: 2022 },
  missed: { make: 'Peugeot', model: '504', year: 1986 },
}

const SLOTS: GarageSlot[] = ['first', 'current', 'dream', 'missed']

/* Cada escena en su caja de 320×200, en una grilla de 2×2 a la derecha. */
const CELL_W = 290
const CELL_H = Math.round((CELL_W * 200) / 320)
const GAP = 20
const GRID_X = W - 64 - (CELL_W * 2 + GAP)
const GRID_Y = Math.round((H - (CELL_H * 2 + GAP)) / 2)

const cells = SLOTS.map((slot, index) => {
  const x = GRID_X + (index % 2) * (CELL_W + GAP)
  const y = GRID_Y + Math.floor(index / 2) * (CELL_H + GAP)
  const scene = renderToStaticMarkup(<GarageScene slot={slot} car={EXAMPLES[slot]} />)
    /* librsvg no entiende variables de CSS: el acento va con su valor. */
    .replace(/var\(--accent\)/g, ACCENT)
    .replace('<svg', `<svg x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" color="#ffffff"`)
  return `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)"/>${scene}`
}).join('')

const brand = brandLockup()

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="64" y="118" ${FONT} font-size="22" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.56)">EL GARAGE VIRTUAL</text>
  <text x="64" y="220" ${FONT} font-size="76" font-weight="700" fill="#ffffff">Los autos</text>
  <text x="64" y="304" ${FONT} font-size="76" font-weight="700" fill="#ffffff">que me</text>
  <text x="64" y="388" ${FONT} font-size="76" font-weight="700" fill="#ffffff">marcaron.</text>
  ${brand}
  ${cells}
</svg>`

await writeLamina('og-garage.png', svg)
