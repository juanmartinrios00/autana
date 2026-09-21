import { describe, expect, it } from 'vitest'
import { longDate } from './blog'
import { posts } from '../content/blog/posts'

/**
 * La fecha del artículo tiene una trampa que ya está documentada en el módulo
 * y es exactamente el tipo de cosa que alguien "limpia" sin saber:
 * `new Date('2026-09-15')` se interpreta como medianoche UTC, y en Argentina
 * eso es el día anterior a las 21. Sin el mediodía que le agrega `longDate`, la
 * nota sale fechada un día antes de lo que dice el archivo.
 */
describe('longDate', () => {
  it('respeta el día que dice el archivo', () => {
    expect(longDate('2026-09-15')).toBe('15 de septiembre de 2026')
  })

  /* El primero de enero es el peor caso: con el corrimiento, la nota se iría
     al año anterior. */
  it('no se corre de día ni en el primero de enero', () => {
    expect(longDate('2026-01-01')).toBe('1 de enero de 2026')
  })

  it('no se corre de día ningún día del año', () => {
    /* Enero, marzo y noviembre cubren los dos lados del cambio de horario. */
    expect(longDate('2026-03-01')).toBe('1 de marzo de 2026')
    expect(longDate('2026-11-01')).toBe('1 de noviembre de 2026')
    expect(longDate('2026-12-31')).toBe('31 de diciembre de 2026')
  })

  it('escribe el mes en palabras y el año completo', () => {
    expect(longDate('2025-07-09')).toMatch(/^\d{1,2} de [a-zé]+ de \d{4}$/)
  })
})

/**
 * Las portadas se levantan solas por el nombre del archivo:
 * `src/assets/blog/<slug>.(jpg|png|webp|...)`. Un nombre que no es el slug de
 * ninguna nota no falla: la foto se despliega y la nota sale sin portada.
 *
 * Y el nombre natural de la foto nunca es el slug. Llegaron como
 * "Transferencia de Auto" y "estafas", y los slugs son
 * `transferir-un-auto-en-argentina` y `estafas-al-comprar-o-vender-un-auto`.
 *
 * Sin `eager`: alcanza con los nombres.
 */
describe('las portadas del blog', () => {
  const PORTADAS = import.meta.glob('../assets/blog/*')

  it('se llaman como una nota', () => {
    const slugs = posts.map((post) => post.slug)
    for (const path of Object.keys(PORTADAS)) {
      const archivo = path.split('/').pop() ?? ''
      const slug = archivo.replace(/\.[a-z0-9]+$/, '')
      expect(slugs, `"${archivo}" no es el slug de ninguna nota`).toContain(slug)
    }
  })
})
