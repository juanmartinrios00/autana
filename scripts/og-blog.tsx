/**
 * Genera una lámina por nota del blog: `public/og-blog-<slug>.png`.
 *
 *   npm run og:blog
 *
 * Una por nota y no una sola para todas, que es lo contrario de lo que se
 * decidió para el garage. El motivo es el mismo mirado al revés: allá la imagen
 * tenía que decir "esto es un garage", y eso no cambia de una persona a otra.
 * Acá lo que se comparte es el artículo, y lo que distingue a un artículo de
 * otro es de qué habla. Una nota sobre transferencias y otra sobre estafas con
 * la misma imagen son el mismo link dos veces.
 *
 * Se pueden dibujar de antemano porque las notas viven en el bundle: son cuatro
 * archivos conocidos, no algo que cambie solo. Por eso esto no está en el
 * worker ---dibujar al vuelo pediría un motor de SVG en WebAssembly adentro,
 * unos 2,5 MB contra un límite de 3--- sino acá, corriendo cuando hace falta.
 *
 * Agregar una nota y olvidarse de correr esto deja esa nota sin imagen, y no
 * falla en ningún lado: hay un test que ata las dos listas.
 */
import { SILHOUETTES } from '../src/components/garage/silhouettes'
import { postsByDate } from '../src/content/blog/posts'
import { brandLockup, FONT, H, INK, W, writeLamina } from './og-base'

const PAD = 64
const MAX_W = W - PAD * 2
const MAX_LINES = 4

/* De mayor a menor: se usa el más grande que entre. Un título corto merece
   cuerpo grande y uno largo prefiere leerse a gritar. */
const SIZES = [72, 62, 54, 46]

/* Arial bold mide más o menos 0,56 del cuerpo por carácter. Es a ojo y alcanza:
   el único riesgo es cortar una línea antes de tiempo, que se ve bien igual. */
const CHAR = 0.56

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Corta en palabras enteras, o `null` si no entra en `MAX_LINES`. */
function wrap(text: string, size: number): string[] | null {
  const max = Math.floor(MAX_W / (size * CHAR))
  const lines: string[] = []
  let line = ''

  for (const word of text.split(' ')) {
    const tentativa = line ? `${line} ${word}` : word
    if (tentativa.length <= max) {
      line = tentativa
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)

  return lines.length <= MAX_LINES ? lines : null
}

function fit(text: string): { size: number; lines: string[] } {
  for (const size of SIZES) {
    const lines = wrap(text, size)
    if (lines) return { size, lines }
  }
  /* Ningún título del blog llega acá, pero uno nuevo podría: antes de dibujar
     algo cortado, se dibuja el más chico con las líneas que salgan. */
  return { size: SIZES[SIZES.length - 1]!, lines: wrap(text, SIZES[SIZES.length - 1]!) ?? [text] }
}

/* Un auto chico abajo a la derecha, con su suelo, del mismo dibujo que la
   lámina de la portada. No dice nada que el título no diga: está para que las
   tres láminas se lean como de la misma casa. */
const CAR_SCALE = 1.1
const CAR_GROUND = 545
const auto = (() => {
  const shape = SILHOUETTES.hatchback
  const [rear, front] = shape.wheels
  const partes = [
    `<path d="${shape.body}"/>`,
    ...shape.details.map((d) => `<path d="${d}"/>`),
    `<circle cx="${rear}" cy="0" r="${shape.wheelRadius}"/>`,
    `<circle cx="${front}" cy="0" r="${shape.wheelRadius}"/>`,
  ].join('')

  return [
    `<path d="M860 ${CAR_GROUND}H${W - PAD}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>`,
    `<g fill="none" stroke="rgba(255,255,255,0.44)" stroke-linecap="square" stroke-linejoin="miter" stroke-width="${2 / CAR_SCALE}" transform="translate(1010 ${CAR_GROUND}) scale(${CAR_SCALE})">${partes}</g>`,
  ].join('')
})()

for (const post of postsByDate()) {
  const { size, lines } = fit(post.title)
  const leading = Math.round(size * 1.14)

  const titulo = lines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${220 + i * leading}" ${FONT} font-size="${size}" font-weight="700" fill="#ffffff">${xml(line)}</text>`,
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="${PAD}" y="118" ${FONT} font-size="22" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.56)">${xml(post.tag.toUpperCase())} · ${post.minutes} MIN DE LECTURA</text>
  ${titulo}
  ${brandLockup()}
  ${auto}
</svg>`

  await writeLamina(`og-blog-${post.slug}.png`, svg)
}
