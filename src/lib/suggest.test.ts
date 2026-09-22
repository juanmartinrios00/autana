import { describe, expect, it } from 'vitest'
import { suggest, type MakeModelCount } from './suggest'

const publicados: MakeModelCount[] = [
  { make: 'Toyota', model: 'Hilux', count: 5 },
  { make: 'Toyota', model: 'Corolla', count: 2 },
  { make: 'Toyota', model: 'Etios', count: 1 },
  { make: 'Citroën', model: 'C3', count: 1 },
  { make: 'Citroën', model: 'Berlingo', count: 3 },
  { make: 'Renault', model: 'Symbol', count: 1 },
  { make: 'Volkswagen', model: 'Amarok', count: 4 },
]

const nombres = (text: string) => suggest(publicados, text).map((item) => [item.make, item.model].filter(Boolean).join(' '))

describe('suggest', () => {
  it('por el principio de cualquier palabra de la marca o el modelo', () => {
    expect(nombres('hil')).toEqual(['Toyota Hilux'])
    expect(nombres('ama')).toEqual(['Volkswagen Amarok'])
  })

  /* Por el principio y no en cualquier parte: si no, "a" sugiere todo. */
  it('no encuentra por la mitad de una palabra', () => {
    expect(nombres('ota')).toEqual([])
  })

  it('la marca entera primero, y sus modelos de más a menos autos', () => {
    expect(nombres('toyota')).toEqual(['Toyota', 'Toyota Hilux', 'Toyota Corolla', 'Toyota Etios'])
    expect(suggest(publicados, 'toyota')[0]!.count).toBe(8)
  })

  it('cada palabra afina: "toyota h" es la Hilux, sin la marca entera', () => {
    expect(nombres('toyota h')).toEqual(['Toyota Hilux'])
  })

  it('sin tildes ni mayúsculas', () => {
    expect(nombres('CITROEN')).toEqual(['Citroën', 'Citroën Berlingo', 'Citroën C3'])
  })

  /* Con un solo modelo, "Renault, todos" y "Renault Symbol" son lo mismo. */
  it('una marca con un solo modelo no se repite como marca entera', () => {
    expect(nombres('renault')).toEqual(['Renault Symbol'])
  })

  it('vacío no sugiere nada, y nunca más de seis', () => {
    expect(nombres('   ')).toEqual([])
    const muchos = Array.from({ length: 20 }, (_, i) => ({ make: 'Ford', model: `F${i}`, count: 1 }))
    expect(suggest(muchos, 'f')).toHaveLength(6)
  })
})
