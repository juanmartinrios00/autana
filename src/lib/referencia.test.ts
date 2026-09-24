import { describe, expect, it } from 'vitest'
import { limpiarParaBuscar, referencia } from './referencia'

describe('referencia', () => {
  it('con menos de tres autos no hay referencia', () => {
    expect(referencia([])).toBeNull()
    expect(referencia([10000, 12000])).toBeNull()
  })

  it('da la mitad del medio, no el más barato y el más caro', () => {
    const r = referencia([5000, 9000, 10000, 10500, 11000, 12000, 30000])
    expect(r).toMatchObject({ count: 7, median: 10500 })
    expect(r!.low).toBeGreaterThan(5000)
    expect(r!.high).toBeLessThan(30000)
  })

  it('dice dónde cae el precio cargado', () => {
    const precios = [9000, 10000, 10500, 11000, 12000]
    expect(referencia(precios, 10800)?.position).toBe('dentro')
    expect(referencia(precios, 6000)?.position).toBe('debajo')
    expect(referencia(precios, 16000)?.position).toBe('encima')
    expect(referencia(precios)?.position).toBeNull()
  })

  it('un poco afuera del rango todavía es "dentro"', () => {
    expect(referencia([9000, 10000, 11000], 12000)?.position).toBe('dentro')
  })

  it('ignora precios que no son precios', () => {
    expect(referencia([0, -5, NaN, 10000, 11000, 12000])?.count).toBe(3)
  })
})

describe('limpiarParaBuscar', () => {
  it('saca los comodines de una búsqueda', () => {
    expect(limpiarParaBuscar('Re%nault_')).toBe('Renault')
    expect(limpiarParaBuscar('  Mercedes-Benz  ')).toBe('Mercedes-Benz')
    expect(limpiarParaBuscar('Clase  C')).toBe('Clase C')
  })
})
