import { describe, expect, it } from 'vitest'
/* Con `?raw` y no con `node:fs`: la app se tipa sin los tipos de Node, a
   propósito, y sumarlos para un test los dejaría disponibles en código de
   navegador, donde `process` o `fs` no existen. */
import sql from '../../supabase/migrations/015_garage_theme.sql?raw'
import { GARAGE_THEMES, garageThemeColor } from './garage-theme'

/**
 * La paleta del garage vive en dos lugares: el `check` de la migración 015 y
 * `GARAGE_THEMES`. Si se desincronizan, alguien elige un color en la pantalla y
 * la base lo rechaza, o la base acepta uno que la pantalla no sabe pintar. Este
 * test lee la migración y los compara.
 */
describe('GARAGE_THEMES', () => {
  it('tiene exactamente los mismos ids que acepta la base', () => {
    const check = sql.match(/garage_theme in \(([^)]+)\)/)
    expect(check).not.toBeNull()
    const inDatabase = [...check![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1])

    expect([...GARAGE_THEMES.map((theme) => theme.id)].sort()).toEqual([...inDatabase].sort())
  })

  it('arranca por el negro, que es el default de la columna', () => {
    expect(GARAGE_THEMES[0].id).toBe('ink')
  })

  it('son todos oscuros: encima va texto blanco', () => {
    for (const theme of GARAGE_THEMES) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.color.slice(i, i + 2), 16) / 255)
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      const luminance = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!)
      /* Contraste contra blanco: (1 + 0.05) / (L + 0.05). AA pide 4,5 para texto
         común; se exige bastante más porque encima también van los grises
         translúcidos de la cabecera. */
      expect((1.05 / (luminance + 0.05)) >= 10, `${theme.label} tiene poco contraste`).toBe(true)
    }
  })
})

describe('garageThemeColor', () => {
  it('devuelve el color del tema', () => {
    expect(garageThemeColor('night')).toBe('#14233a')
  })

  it('cae en el negro si llega algo desconocido o nada', () => {
    expect(garageThemeColor('rosa-chicle')).toBe('#0a100c')
    expect(garageThemeColor(null)).toBe('#0a100c')
    expect(garageThemeColor(undefined)).toBe('#0a100c')
  })
})
