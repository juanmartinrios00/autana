/**
 * Genera `public/og-home.png`: la imagen del preview de la portada y de las
 * pantallas fijas.
 *
 *   npm run og:home
 *
 * Es la que se ve cuando alguien manda `auteando.com` a secas ---en un grupo de
 * WhatsApp, en la bio de una red, pegado en un mensaje. Hasta que existió, el
 * link salía como un rectángulo con texto al lado de otros que sí tenían
 * imagen, que es la diferencia entre que lo abran y que lo pasen de largo.
 *
 * Dice lo mismo que la pantalla: que se compra y se vende, y que no hay
 * comisión, que es lo único que no dicen los demás.
 *
 * Los autos son las siluetas de verdad del garage, así que si se retocan los
 * dibujos se vuelve a correr esto y la lámina acompaña. Va con Vite en modo SSR
 * por el logotipo, que son componentes de React.
 */
import { SILHOUETTES } from '../src/components/garage/silhouettes'
import type { BodyType } from '../src/types'
import { brandLockup, FONT, H, INK, W, writeLamina } from './og-base'

/* Tres carrocerías y no una: la lámina tiene que decir "acá hay autos", no
   "acá hay un auto". Estas tres porque son las que más se ven en la calle acá,
   y porque de arriba a abajo van de menos a más masa, que es lo que hace que la
   columna se lea como una lista y no como tres dibujos sueltos. */
const LINEUP: BodyType[] = ['hatchback', 'suv', 'pickup']

/* La columna de la derecha. Los autos vienen en su propio marco ---el suelo es
   y = 0 y el auto entra en x ∈ [-80, 80] con y ≥ -78--- así que se los ubica
   con un `translate` al suelo de cada renglón. */
const COL_X1 = 660
const COL_X2 = W - 64
const CAR_X = (COL_X1 + COL_X2) / 2
const SCALE = 1.9
const GROUNDS = [187, 365, 543]

/* El trazo se compensa a mano en vez de con `vector-effect`, que librsvg no
   aplica: a escala 1,9 una línea de 3 se dibujaría de 5,7 y los autos
   quedarían gordos al lado del logotipo. */
const STROKE = 3

const cars = LINEUP.map((body, index) => {
  const shape = SILHOUETTES[body]
  const [rear, front] = shape.wheels
  const ground = GROUNDS[index]!

  const partes = [
    `<path d="${shape.body}"/>`,
    ...shape.details.map((d) => `<path d="${d}"/>`),
    `<circle cx="${rear}" cy="0" r="${shape.wheelRadius}"/>`,
    `<circle cx="${front}" cy="0" r="${shape.wheelRadius}"/>`,
  ].join('')

  /* El suelo va afuera del grupo escalado: es el mismo largo para los tres
     aunque los autos midan distinto, y eso es lo que alinea la columna. */
  return [
    `<path d="M${COL_X1} ${ground}H${COL_X2}" stroke="rgba(255,255,255,0.28)" stroke-width="${STROKE}"/>`,
    `<g transform="translate(${CAR_X} ${ground}) scale(${SCALE})" stroke-width="${STROKE / SCALE}">${partes}</g>`,
  ].join('')
}).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="64" y="118" ${FONT} font-size="22" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.56)">USADOS Y NUEVOS · ARGENTINA</text>
  <text x="64" y="220" ${FONT} font-size="76" font-weight="700" fill="#ffffff">Comprá y</text>
  <text x="64" y="304" ${FONT} font-size="76" font-weight="700" fill="#ffffff">vendé autos</text>
  <text x="64" y="388" ${FONT} font-size="76" font-weight="700" fill="#ffffff">sin comisión.</text>
  ${brandLockup()}
  <g fill="none" stroke="#ffffff" stroke-linecap="square" stroke-linejoin="miter">${cars}</g>
</svg>`

await writeLamina('og-home.png', svg)
