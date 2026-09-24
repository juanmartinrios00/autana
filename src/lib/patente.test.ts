import { describe, expect, it } from 'vitest'
import { patente } from './patente'

describe('patente', () => {
  it('tiene la forma de una patente Mercosur', () => {
    expect(patente('3f2a9c10-1b2c-4d5e-8f90-a1b2c3d4e5f6')).toMatch(/^[A-Z]{2} \d{3} [A-Z]{2}$/)
  })

  it('es siempre la misma para la misma cuenta', () => {
    const id = '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0'
    expect(patente(id)).toBe(patente(id))
  })

  it('cambia de una cuenta a otra', () => {
    expect(patente('11111111-2222-3333-4444-555555555555')).not.toBe(
      patente('99999999-8888-7777-6666-555555555555'),
    )
  })

  it('no usa las letras que se confunden con números', () => {
    for (let n = 0; n < 200; n += 1) {
      const id = n.toString(16).padStart(8, '0').repeat(4)
      expect(patente(id)).not.toMatch(/[IOQÑ]/)
    }
  })

  it('no se rompe con un id que no es un uuid', () => {
    expect(patente('')).toMatch(/^[A-Z]{2} \d{3} [A-Z]{2}$/)
  })
})
