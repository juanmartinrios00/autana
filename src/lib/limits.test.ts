import { describe, expect, it } from 'vitest'
/* Con `?raw`, igual que el resto de los tests que leen el esquema. */
import sql from '../../supabase/migrations/019_contact_messages.sql?raw'
import garageSql from '../../supabase/migrations/002_garage.sql?raw'
import { CONTACT_LIMITS, GARAGE_YEARS, LIMITS } from './limits'

/**
 * El formulario de contacto y la tabla que lo recibe declaran los mismos
 * límites en dos lugares distintos, y sólo uno de los dos avisa bien.
 *
 * Si el formulario afloja un tope que la base mantiene, quien escribe el
 * mensaje no recibe un cartel: recibe un `violates check constraint` de
 * Postgres, que no dice qué campo ni qué le pasa. Si lo aprieta de más, el
 * formulario rechaza algo que la base habría aceptado y no hay forma de saber
 * por qué.
 */
describe('CONTACT_LIMITS contra la migración 019', () => {
  const between = (column: string) => {
    const pattern = String.raw`length\((?:btrim\()?${column}\)?\) between (\d+) and (\d+)`
    const match = sql.match(new RegExp(pattern))
    expect(match, `no se encontró el check de ${column}`).not.toBeNull()
    return { min: Number(match![1]), max: Number(match![2]) }
  }

  it('el nombre', () => {
    expect(CONTACT_LIMITS.name).toEqual(between('name'))
  })

  it('el mail', () => {
    expect(CONTACT_LIMITS.email).toEqual(between('email'))
  })

  it('el mensaje', () => {
    expect(CONTACT_LIMITS.message).toEqual(between('message'))
  })

  it('ningún mínimo supera a su máximo', () => {
    for (const [field, range] of Object.entries(CONTACT_LIMITS)) {
      expect(range.min, field).toBeLessThan(range.max)
      expect(range.min, field).toBeGreaterThan(0)
    }
  })
})

describe('LIMITS', () => {
  /* Son topes de campos de texto, no una lista de constantes sueltas: uno en
     cero o negativo dejaría el campo inescribible sin que nada falle. */
  it('son todos positivos y entran en una pantalla', () => {
    for (const [field, value] of Object.entries(LIMITS)) {
      expect(value, field).toBeGreaterThan(0)
      expect(value, field).toBeLessThanOrEqual(4000)
    }
  })

  /* La descripción es el único campo con pantalla propia: si algún día otro la
     alcanza, es señal de que se está metiendo un texto largo en una fila. */
  it('la descripción es el más generoso, y por lejos', () => {
    const otros = Object.entries(LIMITS)
      .filter(([field]) => field !== 'description')
      .map(([, value]) => value)
    expect(LIMITS.description).toBeGreaterThan(Math.max(...otros) * 4)
  })
})


describe('GARAGE_YEARS contra la migración 002', () => {
  it('es el mismo rango que acepta la tabla', () => {
    const match = garageSql.match(/year\s+int check \(year between (\d+) and (\d+)\)/)
    expect(match, 'no se encontró el check del año').not.toBeNull()
    expect(GARAGE_YEARS).toEqual({ min: Number(match![1]), max: Number(match![2]) })
  })

  /* El garage va más atrás que los avisos a propósito: ahí entra el auto del
     abuelo, que no está en venta. Si algún día coinciden, es que alguien copió
     uno sobre el otro sin querer. */
  it('empieza antes que el rango de los avisos', () => {
    expect(GARAGE_YEARS.min).toBeLessThan(1950)
  })
})
