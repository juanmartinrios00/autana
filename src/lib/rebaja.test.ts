import { describe, expect, it } from 'vitest'
import { rebaja } from './rebaja'

const now = new Date('2026-09-24T12:00:00Z')
const haceDias = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()

describe('rebaja', () => {
  it('dice el precio de antes y cuánto bajó', () => {
    expect(rebaja({ price: 26000, previousPrice: 30000, priceDroppedAt: haceDias(2) }, now)).toEqual({
      before: 30000,
      percent: 13,
    })
  })

  it('no hay rebaja sin precio de antes', () => {
    expect(rebaja({ price: 26000, previousPrice: null, priceDroppedAt: null }, now)).toBeNull()
  })

  it('deja de mostrarse al mes', () => {
    expect(rebaja({ price: 26000, previousPrice: 30000, priceDroppedAt: haceDias(31) }, now)).toBeNull()
    expect(rebaja({ price: 26000, previousPrice: 30000, priceDroppedAt: haceDias(29) }, now)).not.toBeNull()
  })

  it('un precio de antes que no es mayor no se muestra', () => {
    expect(rebaja({ price: 30000, previousPrice: 30000, priceDroppedAt: haceDias(1) }, now)).toBeNull()
    expect(rebaja({ price: 31000, previousPrice: 30000, priceDroppedAt: haceDias(1) }, now)).toBeNull()
  })

  it('una baja chica dice por lo menos 1%', () => {
    expect(rebaja({ price: 29800, previousPrice: 30000, priceDroppedAt: haceDias(1) }, now)?.percent).toBe(1)
  })

  it('una fecha que no se entiende no rompe nada', () => {
    expect(rebaja({ price: 26000, previousPrice: 30000, priceDroppedAt: 'ayer' }, now)).toBeNull()
  })
})
