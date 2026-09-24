/**
 * Las versiones livianas de la foto del hero:
 *
 *   npm run hero
 *
 * De `mercedes-cochera.jpg` (2200 px, 164 KB) salen cuatro archivos: 900 y
 * 1800 px de ancho, cada uno en AVIF y en WebP. El CSS elige con `image-set`
 * y una consulta de medios (`src/pages/Home.css`).
 *
 * Por qué. Es la imagen más pesada del sitio y la primera que se ve, en la
 * pantalla por la que entra todo el mundo. Un celular de 390 px no necesita
 * 2200: le llegaban 164 KB para mostrar 900. Y siendo fondo de CSS no puede
 * usar `<picture>`, que es como se resuelve en el resto del sitio.
 *
 * El original se conserva: es de donde salen estas, y es el que se reemplaza
 * si algún día cambia la foto.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const carpeta = resolve(process.cwd(), 'src/assets/hero')
const original = resolve(carpeta, 'mercedes-cochera.jpg')
const anchos = [900, 1800]

const entrada = readFileSync(original)
console.log(`original: ${(entrada.length / 1024).toFixed(0)} KB`)

for (const ancho of anchos) {
  const base = sharp(entrada).resize({ width: ancho })

  /* AVIF comprime mucho mejor que JPEG en fotos con degradados ---acá, la
     penumbra de la cochera--- que es donde el JPEG deja bandas. */
  const avif = await base.clone().avif({ quality: 52 }).toBuffer()
  writeFileSync(resolve(carpeta, `mercedes-cochera-${ancho}.avif`), avif)

  /* WebP para los que no leen AVIF, que a esta altura son pocos pero existen:
     Edge en Windows sin actualizar y algún Android viejo. */
  const webp = await base.clone().webp({ quality: 74 }).toBuffer()
  writeFileSync(resolve(carpeta, `mercedes-cochera-${ancho}.webp`), webp)

  console.log(
    `${ancho} px · avif ${(avif.length / 1024).toFixed(0)} KB · webp ${(webp.length / 1024).toFixed(0)} KB`,
  )
}
