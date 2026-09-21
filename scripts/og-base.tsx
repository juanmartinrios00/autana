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
import { BrandLockup } from '../src/components/brand/Logo'

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
 * La firma de abajo a la izquierda: el símbolo y el logotipo, el mismo dibujo
 * alineado que va en el pie del sitio.
 *
 * Es el componente de la aplicación, así que si la marca cambia se vuelven a
 * correr los scripts y todas las láminas acompañan. Un `<svg>` anidado con `x`,
 * `y`, `width` y `height` se posiciona y escala solo contra su `viewBox`; el
 * `color` es el del texto, que va en `currentColor`. El símbolo trae sus
 * propios colores.
 *
 * El ancho sale de la proporción del dibujo y no escrito a ojo: un ancho que no
 * coincide deja el logo flotando adentro de una caja que no es la suya.
 */
export function brandLockup(): string {
  const alto = 34
  const ancho = (alto * 1487.75) / 167.25

  return renderToStaticMarkup(
    <BrandLockup x={64} y={H - 107} width={ancho} height={alto} color="#ffffff" />,
  )
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
