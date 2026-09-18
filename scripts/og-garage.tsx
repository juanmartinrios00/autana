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
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { BrandMark, Wordmark } from '../src/components/brand/Logo'
import { GarageScene } from '../src/components/garage/scenes'
import type { GarageSlot } from '../src/types'

const W = 1200
const H = 630
const INK = '#0a100c'
const ACCENT = '#ffd100'

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

const font = `font-family="Arial, Helvetica, sans-serif"`

/* La firma de abajo a la izquierda: el símbolo en su caja amarilla y el
   logotipo al lado, el mismo lockup que el pie del sitio.

   Antes era un cuadrado amarillo y el nombre escrito en Arial. Funcionaba como
   marcador de posición, pero esta imagen es lo que se ve en un grupo de
   WhatsApp: ahí la marca tiene que aparecer dibujada, no tipeada en la fuente
   que haya.

   Los componentes son los mismos que usa la aplicación, así que si el logotipo
   cambia se vuelve a correr esto y la imagen acompaña ---igual que con las
   escenas del garage. Un `<svg>` anidado con `x`, `y`, `width` y `height` se
   posiciona y escala solo contra su propio `viewBox`; el `color` es lo que
   resuelven los trazos, que van todos en `currentColor`. */
const MARK_BOX = 44
const markY = H - 112
const brand = [
  `<rect x="64" y="${markY}" width="${MARK_BOX}" height="${MARK_BOX}" rx="6" fill="${ACCENT}"/>`,
  /* Los altos mandan y los anchos salen de la proporcion de cada dibujo: el
     simbolo es 0,951 a 1 y el logotipo 5,707 a 1. Escritos a ojo, un `viewBox`
     nuevo dejaria el logo centrado adentro de una caja que no es la suya ---no
     se estira, porque `preserveAspectRatio` no deja, pero queda flotando. */
  renderToStaticMarkup(
    <BrandMark x={76} y={markY + 8} width={27} height={28} color={INK} />,
  ),
  renderToStaticMarkup(
    <Wordmark x={126} y={markY + 9} width={149} height={26} color="#ffffff" />,
  ),
].join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="64" y="118" ${font} font-size="22" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.56)">EL GARAGE VIRTUAL</text>
  <text x="64" y="220" ${font} font-size="76" font-weight="700" fill="#ffffff">Los autos</text>
  <text x="64" y="304" ${font} font-size="76" font-weight="700" fill="#ffffff">que me</text>
  <text x="64" y="388" ${font} font-size="76" font-weight="700" fill="#ffffff">marcaron.</text>
  ${brand}
  ${cells}
</svg>`

/* Contra el directorio de trabajo y no contra `import.meta.url`: esto corre
   compilado desde `node_modules/.cache`, y ahí `../public` es otra carpeta.
   `npm run` siempre arranca en la raíz del proyecto. */
const out = resolve(process.cwd(), 'public/og-garage.png')
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer()
writeFileSync(out, png)
console.log(`og-garage.png: ${W}x${H}, ${png.length} bytes`)
