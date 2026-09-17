import { describe, expect, it } from 'vitest'
import {
  bodyLabels,
  conditionLabels,
  fuelLabels,
  sellerTypeLabels,
  statusLabels,
  transmissionLabels,
} from './format'

/**
 * Que nadie vuelva a escribir a mano una lista que ya existe.
 *
 * Es el error que mas veces aparecio en este repo: los combustibles,
 * carrocerias, condiciones y transmisiones llegaron a estar escritos en siete
 * lugares ---el tipo, las etiquetas, el `check` de la base, el panel de filtros,
 * el parser de la URL, el carrusel de la portada y el select de vendedor.
 *
 * No falla nunca de golpe. Falla el dia que alguien suma un valor al dominio:
 * queda ofrecido en una pantalla y ausente en otra, sin ningun error en el
 * medio. Un combustible que existe en los avisos y no en el filtro es peor que
 * uno que no existe, porque los autos estan y no hay forma de llegar.
 *
 * La regla: la lista se declara una vez, como `Record<Union, algo>` para que el
 * compilador exija que este completa, y todo lo demas sale de `Object.keys`.
 * Cuando cada elemento necesita texto propio que no son las etiquetas ---como
 * las dos tarjetas del registro--- tambien va como `Record`, y la pantalla lo
 * recorre con la lista derivada.
 */

/* Con `import.meta.glob` y no con `node:fs`: la app se tipa sin los tipos de
   Node a proposito, y sumarlos para un test los dejaria disponibles en codigo
   de navegador, donde `process` y `fs` no existen. Es el mismo mecanismo con el
   que `blog.ts` levanta las portadas. */
const SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const DOMINIO: Record<string, string[]> = {
  combustibles: Object.keys(fuelLabels),
  transmisiones: Object.keys(transmissionLabels),
  carrocerias: Object.keys(bodyLabels),
  condiciones: Object.keys(conditionLabels),
  'tipos de vendedor': Object.keys(sellerTypeLabels),
  estados: Object.keys(statusLabels),
}

/* `format.ts` es donde viven, y `types/index.ts` donde se declara la union. */
const DECLARAN = /(lib\/format\.ts|types\/index\.ts)$/

const archivos = Object.entries(SOURCES).filter(
  ([path]) => !path.includes('.test.') && !DECLARAN.test(path),
)

describe('las listas del dominio se declaran una sola vez', () => {
  it('ningún archivo copia una lista completa', () => {
    const copias: string[] = []

    for (const [path, text] of archivos) {
      /* Literales de array sin anidar. Una lista copiada entra entera en uno;
         un mapa de modelo a carrocería, que también menciona estos valores, los
         reparte entre miles de caracteres y nunca cae en el mismo. */
      for (const match of text.matchAll(/\[[^[\]]{0,300}\]/gs)) {
        const valores = new Set([...match[0].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]))
        for (const [nombre, lista] of Object.entries(DOMINIO)) {
          if (lista.every((value) => valores.has(value))) copias.push(`${path}: ${nombre}`)
        }
      }
    }

    expect([...new Set(copias)].sort()).toEqual([])
  })

  it('el barrido está mirando código de verdad', () => {
    expect(archivos.length).toBeGreaterThan(40)
  })
})
