/**
 * Lo que comparten las láminas de preview: la medida, los colores, la firma de
 * la marca y el escribir el png.
 *
 * Existe desde que hay dos (`og-garage` y `og-home`). El logotipo escrito dos
 * veces es exactamente lo que se rompe solo: se retoca una lámina, la otra
 * queda con la firma vieja, y nadie lo ve porque estas imágenes no se miran
 * nunca desde el sitio ---se ven en un chat ajeno.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { BrandMark, Wordmark } from '../src/components/brand/Logo'

/* La medida que piden Open Graph y Twitter para la tarjeta grande. */
export const W = 1200
export const H = 630
export const INK = '#0a100c'
export const ACCENT = '#ffd100'

/* librsvg no resuelve la familia variable del sitio, así que el texto de las
   láminas va en una familia que el sistema tenga seguro. El logotipo no: ese
   viene dibujado en curvas y sale igual siempre, que es de lo que se trata. */
export const FONT = 'font-family="Arial, Helvetica, sans-serif"'

/**
 * La firma de abajo a la izquierda: el símbolo en su caja amarilla y el
 * logotipo al lado, el mismo lockup que el pie del sitio.
 *
 * Los componentes son los mismos que usa la aplicación, así que si el logotipo
 * cambia se vuelven a correr los scripts y las dos imágenes acompañan.
 *
 * Un `<svg>` anidado con `x`, `y`, `width` y `height` se posiciona y escala
 * solo contra su propio `viewBox`; el `color` es lo que resuelven los trazos,
 * que van todos en `currentColor`. Los altos mandan y los anchos salen de la
 * proporción de cada dibujo ---el símbolo es 0,951 a 1 y el logotipo 5,707 a
 * 1--- porque un `viewBox` escrito a ojo dejaría el logo flotando adentro de
 * una caja que no es la suya.
 */
export function brandLockup(): string {
  const MARK_BOX = 44
  const y = H - 112

  return [
    `<rect x="64" y="${y}" width="${MARK_BOX}" height="${MARK_BOX}" rx="6" fill="${ACCENT}"/>`,
    renderToStaticMarkup(<BrandMark x={76} y={y + 8} width={27} height={28} color={INK} />),
    renderToStaticMarkup(<Wordmark x={126} y={y + 9} width={149} height={26} color="#ffffff" />),
  ].join('')
}

/**
 * Escribe la lámina en `public/`.
 *
 * Contra el directorio de trabajo y no contra `import.meta.url`: esto corre
 * compilado desde `node_modules/.cache`, y ahí `../public` es otra carpeta.
 * `npm run` siempre arranca en la raíz del proyecto.
 */
export async function writeLamina(name: string, svg: string): Promise<void> {
  const out = resolve(process.cwd(), `public/${name}`)
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer()
  writeFileSync(out, png)
  console.log(`${name}: ${W}x${H}, ${png.length} bytes`)
}
