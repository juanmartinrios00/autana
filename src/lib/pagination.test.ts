import { describe, expect, it } from 'vitest'
import { pageWindow } from './pagination'

describe('pageWindow', () => {
  it('sin huecos mientras entren todas', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('se apoya contra el principio', () => {
    expect(pageWindow(1, 42)).toEqual([1, 2, 3, 4, 5, 'gap', 42])
    expect(pageWindow(4, 42)).toEqual([1, 2, 3, 4, 5, 'gap', 42])
  })

  it('se apoya contra el final', () => {
    expect(pageWindow(42, 42)).toEqual([1, 'gap', 38, 39, 40, 41, 42])
    expect(pageWindow(39, 42)).toEqual([1, 'gap', 38, 39, 40, 41, 42])
  })

  it('en el medio deja ver la anterior y la siguiente', () => {
    expect(pageWindow(20, 42)).toEqual([1, 'gap', 19, 20, 21, 'gap', 42])
  })

  /* El ancho fijo es lo que evita que la fila salte mientras se navega. */
  it('siempre ocupa el mismo ancho', () => {
    for (let page = 1; page <= 42; page++) {
      expect(pageWindow(page, 42)).toHaveLength(7)
    }
  })

  /* Un `…` que tapa una sola página ocupa lo mismo que el número que esconde. */
  it('nunca esconde una única página detrás de un hueco', () => {
    for (let total = 8; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const slots = pageWindow(page, total)
        const numbers = slots.filter((slot): slot is number => slot !== 'gap')
        slots.forEach((slot, index) => {
          if (slot !== 'gap') return
          const before = slots[index - 1] as number
          const after = slots[index + 1] as number
          expect(after - before, `pagina ${page} de ${total}`).toBeGreaterThan(2)
        })
        expect(numbers).toContain(page)
        expect(numbers[0]).toBe(1)
        expect(numbers.at(-1)).toBe(total)
      }
    }
  })

  it('tolera una página fuera de rango', () => {
    expect(pageWindow(0, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(99, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(1, 0)).toEqual([])
  })
})
