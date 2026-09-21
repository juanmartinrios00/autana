import { describe, expect, it } from 'vitest'
/* Con `?raw` y no con `node:fs`, por lo mismo que en `garage-theme.test.ts`:
   la app se tipa sin los tipos de Node a propósito. */
import sql from '../../supabase/migrations/002_garage.sql?raw'
import { computeLevel } from '../lib/levels'
import { SLOTS } from './garage-slots'

/**
 * Los espacios del garage están declarados en tres lugares: esta lista, el
 * tipo `GarageSlot` y el `check` de la migración 002. Si se desincronizan,
 * alguien carga un auto en un espacio que la base rechaza, o la base acepta uno
 * que la pantalla no sabe dibujar.
 */
describe('SLOTS', () => {
  it('tiene exactamente los mismos ids que acepta la base', () => {
    const check = sql.match(/slot\s+text not null check \(slot in \(([^)]+)\)\)/)
    expect(check, 'no se encontró el check de la migración 002').not.toBeNull()
    const enLaBase = [...check![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1])

    expect(SLOTS.map((slot) => slot.id).sort()).toEqual([...enLaBase].sort())
  })

  it('ninguno se queda sin título ni sin pista', () => {
    for (const slot of SLOTS) {
      expect(slot.title.length, slot.id).toBeGreaterThan(0)
      expect(slot.hint.length, slot.id).toBeGreaterThan(0)
    }
  })

  it('no hay ids repetidos', () => {
    expect(new Set(SLOTS.map((slot) => slot.id)).size).toBe(SLOTS.length)
  })

  /**
   * El logro de garage completo pide `SLOTS.length`, así que sumar un espacio
   * ajusta el umbral solo. Lo que no se ajusta solo es el texto: la pista dice
   * "los cuatro espacios" en letras y la página del garage dice "N de 4". Este
   * test está para que sumar un quinto espacio falle acá y no en pantalla.
   */
  it('son cuatro, que es lo que dicen los textos', () => {
    expect(SLOTS.length).toBe(4)

    const hint = computeLevel({
      profile: null,
      activeListings: 0,
      publishedListings: 0,
      soldListings: 0,
      bestPhotoCount: 0,
      garageCars: 0,
    }).achievements.find((item) => item.id === 'garage_complete')!.hint
    expect(hint).toContain('cuatro')
  })

  it('el logro de garage completo se gana con todos los espacios llenos', () => {
    const conGarage = (garageCars: number) =>
      computeLevel({
        profile: null,
        activeListings: 0,
        publishedListings: 0,
        soldListings: 0,
        bestPhotoCount: 0,
        garageCars,
      })
        .achievements.find((item) => item.id === 'garage_complete')!.done

    expect(conGarage(SLOTS.length - 1)).toBe(false)
    expect(conGarage(SLOTS.length)).toBe(true)
  })
})
