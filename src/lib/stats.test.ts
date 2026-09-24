import { describe, expect, it } from 'vitest'
import { fillDays, isoDay, summarize } from './stats'

const hoy = new Date(2026, 8, 24) // 24 de septiembre de 2026, hora local

describe('isoDay', () => {
  /* El error clásico de este sitio: `toISOString()` pasa por UTC y en
     Argentina eso resta un día a todo lo de después de las 21. */
  it('da el día local, no el de UTC', () => {
    expect(isoDay(new Date(2026, 0, 1, 22, 30))).toBe('2026-01-01')
    expect(isoDay(new Date(2026, 8, 24))).toBe('2026-09-24')
  })
})

describe('fillDays', () => {
  it('rellena con ceros los días sin movimiento, del más viejo a hoy', () => {
    const dias = fillDays([{ day: '2026-09-23', views: 4, interests: 1 }], 3, hoy)
    expect(dias).toEqual([
      { day: '2026-09-22', views: 0, interests: 0 },
      { day: '2026-09-23', views: 4, interests: 1 },
      { day: '2026-09-24', views: 0, interests: 0 },
    ])
  })

  /* Un aviso de hace meses trae días viejos que ya no entran en el período. */
  it('deja afuera lo que quedó atrás del período', () => {
    const dias = fillDays([{ day: '2026-01-01', views: 99, interests: 9 }], 2, hoy)
    expect(dias.map((d) => d.views)).toEqual([0, 0])
  })

  it('sin nada, devuelve el período entero en cero', () => {
    expect(fillDays([], 14, hoy)).toHaveLength(14)
    expect(fillDays([], 14, hoy).every((d) => d.views === 0)).toBe(true)
  })
})

describe('summarize', () => {
  const dias = (views: number[]) =>
    views.map((v, i) => ({ day: `2026-09-${String(i + 11).padStart(2, '0')}`, views: v, interests: 0 }))

  it('suma la segunda mitad y la compara con la primera', () => {
    const resumen = summarize(dias([1, 1, 1, 1, 2, 2, 2, 2]))
    expect(resumen.views).toBe(8)
    expect(resumen.trend).toBe(100)
  })

  it('una caída se ve como caída', () => {
    expect(summarize(dias([10, 10, 5, 5])).trend).toBe(-50)
  })

  /* De cero a diez no es "infinito por ciento más": es que antes no entraba
     nadie, y mostrar un número ahí sería inventarlo. */
  it('sin nada antes, no hay porcentaje', () => {
    expect(summarize(dias([0, 0, 5, 5])).trend).toBeNull()
  })

  it('cuenta las consultas de la última mitad', () => {
    const conConsultas = [
      { day: 'a', views: 0, interests: 5 },
      { day: 'b', views: 0, interests: 3 },
    ]
    expect(summarize(conConsultas).interests).toBe(3)
  })
})
