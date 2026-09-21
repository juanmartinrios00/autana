/**
 * Genera los íconos del sitio desde el símbolo de la marca:
 *
 *   npm run iconos
 *
 *   public/favicon.svg          el de la pestaña en los navegadores al día
 *   public/favicon.ico          16, 32 y 48 px, para los que no leen SVG y para
 *                               Google y los lectores de RSS, que piden
 *                               /favicon.ico a secas sin mirar las etiquetas
 *   public/apple-touch-icon.png 180 px, el de la pantalla de inicio del iPhone
 *
 * Salen del mismo `BrandMark` que dibuja la aplicación, así que si el símbolo
 * cambia se vuelve a correr esto y los tres acompañan. Antes se hacían a mano
 * con el kit, y la marca vieja habría quedado en la pestaña después de cambiar
 * la del sitio.
 *
 * El del iPhone va a sangre, amarillo hasta el borde: iOS le pone sus propias
 * esquinas redondeadas, y lo que queda transparente lo pinta de negro. Los otros
 * dos conservan las esquinas del símbolo.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { BrandMark } from '../src/components/brand/Logo'

const AMARILLO = '#FFD100'
const publico = (nombre: string) => resolve(process.cwd(), 'public', nombre)

const svg = renderToStaticMarkup(<BrandMark xmlns="http://www.w3.org/2000/svg" width={512} height={512} />)

writeFileSync(publico('favicon.svg'), svg)
console.log(`favicon.svg: ${svg.length} bytes`)

const png = (lado: number) => sharp(Buffer.from(svg), { density: 300 }).resize(lado, lado).png().toBuffer()

/* El ICO por dentro: una cabecera, una entrada de 16 bytes por tamaño, y cada
   imagen como PNG tal cual. Los navegadores leen PNG adentro de un ICO desde
   hace más de diez años, y así no hace falta ninguna librería para armarlo. */
const lados = [16, 32, 48]
const imagenes = await Promise.all(lados.map(png))
const cabecera = Buffer.alloc(6 + 16 * lados.length)
cabecera.writeUInt16LE(0, 0)
cabecera.writeUInt16LE(1, 2)
cabecera.writeUInt16LE(lados.length, 4)
let offset = cabecera.length
lados.forEach((lado, i) => {
  const entrada = 6 + 16 * i
  cabecera.writeUInt8(lado, entrada)
  cabecera.writeUInt8(lado, entrada + 1)
  cabecera.writeUInt8(0, entrada + 2)
  cabecera.writeUInt8(0, entrada + 3)
  cabecera.writeUInt16LE(1, entrada + 4)
  cabecera.writeUInt16LE(32, entrada + 6)
  cabecera.writeUInt32LE(imagenes[i]!.length, entrada + 8)
  cabecera.writeUInt32LE(offset, entrada + 12)
  offset += imagenes[i]!.length
})
const ico = Buffer.concat([cabecera, ...imagenes])
writeFileSync(publico('favicon.ico'), ico)
console.log(`favicon.ico: ${lados.join(', ')} px, ${ico.length} bytes`)

const touch = await sharp(await png(180)).flatten({ background: AMARILLO }).png().toBuffer()
writeFileSync(publico('apple-touch-icon.png'), touch)
console.log(`apple-touch-icon.png: 180x180, ${touch.length} bytes`)
