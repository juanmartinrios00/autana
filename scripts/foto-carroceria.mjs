/**
 * Prepara la foto de una carrocería para la sección de la portada.
 *
 *   npm run foto:carroceria -- sedan ruta/a/la/foto.jpg
 *   npm run foto:carroceria -- sedan ruta/a/la/foto.jpg --espejar
 *
 * Deja `src/assets/carrocerias/<tipo>.webp`, y la sección la levanta sola por
 * el nombre del archivo, igual que los logos de las marcas.
 *
 * Lo que hace, en orden:
 *
 * 0. Si la foto ya viene sin fondo ---un PNG con las esquinas transparentes---
 *    se usa la transparencia que trae y se salta el paso 1. Sólo se corrige lo
 *    que dejan las herramientas de recorte: el auto les queda al 98 o 99 % de
 *    opacidad, que no se nota a simple vista pero sobre el gris de la caja lo
 *    tiñe apenas, y una bruma casi invisible alrededor que se limpia.
 * 1. Saca el fondo. Las cajas no son blancas ---son `--surface`, un gris
 *    verdoso muy claro--- así que una foto con su fondo se vería como un
 *    rectángulo blanco adentro de la caja. Se asume un fondo claro y parejo,
 *    que es como vienen las fotos de catálogo: se inunda desde los bordes y se
 *    borra sólo lo que está conectado con afuera. Un reflejo blanco en la
 *    chapa no toca el borde, así que no se borra, que es lo que pasaría con un
 *    umbral de color aplicado a toda la foto.
 * 2. Suaviza el contorno. En los tres píxeles que tocan el fondo se separa el
 *    blanco del color del auto en vez de cortar en seco: un corte seco deja un
 *    filo blanco que sobre el gris de la caja se ve.
 * 3. Recorta al auto, para que todos empiecen en el mismo lugar de la caja sin
 *    importar cuánto margen traía la foto.
 * 4. Con `--espejar`, lo da vuelta. En la caja todos miran a la izquierda, hacia
 *    el texto, y se cortan de cola contra el borde derecho: la parte que se ve
 *    es la trompa. Una foto que mira a la derecha se corta de trompa.
 *
 * No valida el tipo contra la lista de carrocerías a propósito: esa lista
 * existe una vez, en `src/lib/format.ts`. Un archivo con un nombre que no es
 * una carrocería lo atrapa un test.
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const [tipo, entrada, ...banderas] = process.argv.slice(2)
if (!tipo || !entrada) {
  console.error('Uso: npm run foto:carroceria -- <tipo> <foto> [--espejar]')
  process.exit(1)
}
const espejar = banderas.includes('--espejar')

/* Qué tan claro tiene que ser un píxel para contar como fondo. Bajo, se come
   partes claras del auto que tocan el borde; alto, deja sombras de fondo. */
const UMBRAL = 236
/* El ancho del contorno que se suaviza. */
const BANDA = 3
/* Ancho final. La caja lo muestra a unos 330 px, así que alcanza para pantallas
   de doble densidad con margen. */
const ANCHO = 900

const { data: fuente, info } = await sharp(entrada)
  .rotate()
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info
const n = w * h

/* Ya sin fondo si las cuatro esquinas son transparentes: una foto con fondo
   no tiene forma de tenerlas así. */
const esquinas = [0, w - 1, (h - 1) * w, n - 1]
const yaRecortada = esquinas.every((i) => fuente[i * 4 + 3] === 0)

/* Por debajo de esto, en una foto ya recortada, es bruma y no auto. Por
   encima de `OPACO`, es auto que la herramienta dejó apenas traslúcido. */
const BRUMA = 10
const OPACO = 240

const data = Buffer.alloc(n * 3)
for (let i = 0; i < n; i++) {
  data[i * 3] = fuente[i * 4]
  data[i * 3 + 1] = fuente[i * 4 + 1]
  data[i * 3 + 2] = fuente[i * 4 + 2]
}

const claro = (i) => Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) >= UMBRAL

/* 1. El fondo: lo claro que se alcanza desde el borde sin cruzar el auto. */
const fondo = new Uint8Array(n)
const cola = new Int32Array(n)
let cabeza = 0
let fin = 0
const sembrar = (i) => {
  if (!fondo[i] && claro(i)) {
    fondo[i] = 1
    cola[fin++] = i
  }
}
for (let x = 0; x < w && !yaRecortada; x++) {
  sembrar(x)
  sembrar((h - 1) * w + x)
}
for (let y = 0; y < h && !yaRecortada; y++) {
  sembrar(y * w)
  sembrar(y * w + w - 1)
}
while (cabeza < fin) {
  const i = cola[cabeza++]
  const x = i % w
  if (x > 0) sembrar(i - 1)
  if (x < w - 1) sembrar(i + 1)
  if (i >= w) sembrar(i - w)
  if (i < n - w) sembrar(i + w)
}

/* 2. La banda del contorno: lo que queda a `BANDA` píxeles del fondo. */
let banda = new Uint8Array(fondo)
for (let paso = 0; paso < (yaRecortada ? 0 : BANDA); paso++) {
  const siguiente = new Uint8Array(banda)
  for (let i = 0; i < n; i++) {
    if (banda[i]) continue
    const x = i % w
    if ((x > 0 && banda[i - 1]) || (x < w - 1 && banda[i + 1]) || (i >= w && banda[i - w]) || (i < n - w && banda[i + w])) {
      siguiente[i] = 1
    }
  }
  banda = siguiente
}

const rgba = Buffer.alloc(n * 4)
let x0 = w, y0 = h, x1 = -1, y1 = -1
for (let i = 0; i < n; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
  let a = 255, rr = r, gg = g, bb = b

  if (yaRecortada) {
    const original = fuente[i * 4 + 3]
    a = original < BRUMA ? 0 : original > OPACO ? 255 : original
  } else if (fondo[i]) {
    a = 0
  } else if (banda[i]) {
    /* Se separa el blanco: el píxel del borde es una mezcla de auto y fondo, y
       la opacidad es cuánto se aleja del blanco. El color se recalcula para que
       compuesto sobre cualquier superficie clara dé lo mismo que sobre blanco. */
    const alfa = Math.max(255 - r, 255 - g, 255 - b) / 255
    if (alfa === 0) {
      a = 0
    } else {
      a = Math.round(alfa * 255)
      rr = Math.round(255 - (255 - r) / alfa)
      gg = Math.round(255 - (255 - g) / alfa)
      bb = Math.round(255 - (255 - b) / alfa)
    }
  }

  rgba[i * 4] = rr
  rgba[i * 4 + 1] = gg
  rgba[i * 4 + 2] = bb
  rgba[i * 4 + 3] = a

  if (a > 8) {
    const x = i % w, y = (i - x) / w
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
}

if (x1 < 0) {
  console.error('No encontré el auto: la foto quedó entera como fondo. ¿Tiene el fondo claro?')
  process.exit(1)
}

/* 3 y 4. Recortar, dar vuelta si hace falta, achicar. */
let foto = sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({
  left: x0,
  top: y0,
  width: x1 - x0 + 1,
  height: y1 - y0 + 1,
})
if (espejar) foto = foto.flop()

const salida = resolve(process.cwd(), `src/assets/carrocerias/${tipo}.webp`)
mkdirSync(resolve(process.cwd(), 'src/assets/carrocerias'), { recursive: true })
const archivo = await foto
  .resize({ width: ANCHO, withoutEnlargement: true })
  .webp({ quality: 84, alphaQuality: 90 })
  .toFile(salida)

console.log(`${tipo}.webp: ${archivo.width}x${archivo.height}, ${archivo.size} bytes${espejar ? ', espejada' : ''}${yaRecortada ? ', ya venía sin fondo' : ''}`)
