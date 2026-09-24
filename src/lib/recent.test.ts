import { describe, expect, it } from 'vitest'
import { MAX_RECENT, parseRecent, pushRecent } from './recent'

describe('pushRecent', () => {
  it('el último mirado va primero', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b'])
  })

  /* Volver a un auto lo sube, no lo duplica: la lista es "los últimos que
     miraste", no "cuántas veces entraste". */
  it('mirar de nuevo uno que ya estaba lo sube sin repetirlo', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('no crece más allá del tope, y suelta el más viejo', () => {
    const llena = Array.from({ length: MAX_RECENT }, (_, i) => `auto-${i}`)
    const next = pushRecent(llena, 'nuevo')
    expect(next).toHaveLength(MAX_RECENT)
    expect(next[0]).toBe('nuevo')
    expect(next).not.toContain(`auto-${MAX_RECENT - 1}`)
  })

  it('un slug vacío no ensucia la lista', () => {
    expect(pushRecent(['a'], '')).toEqual(['a'])
  })
})

/* Lo guardado lo puede escribir cualquiera: la consola, una extensión, una
   versión vieja del sitio. Si un valor raro rompiera esto, la pantalla se
   caería entera por algo que no es un dato nuestro. */
describe('parseRecent', () => {
  it('lee una lista de slugs', () => {
    expect(parseRecent('["a","b"]')).toEqual(['a', 'b'])
  })

  it('aguanta lo que no es una lista de textos', () => {
    expect(parseRecent(null)).toEqual([])
    expect(parseRecent('')).toEqual([])
    expect(parseRecent('no es json')).toEqual([])
    expect(parseRecent('{"a":1}')).toEqual([])
    expect(parseRecent('[1,2,{"x":1},null,"bueno",""]')).toEqual(['bueno'])
  })

  it('saca repetidos y aplica el tope', () => {
    expect(parseRecent('["a","a","b"]')).toEqual(['a', 'b'])
    expect(parseRecent(JSON.stringify(Array.from({ length: 50 }, (_, i) => `x${i}`)))).toHaveLength(
      MAX_RECENT,
    )
  })
})
