import { describe, expect, it } from 'vitest'
import { describeError, errorCode } from './errors'

/**
 * Lo que este módulo resuelve es que los errores de Supabase no son
 * instancias de `Error`: son objetos planos. Un `catch` que sólo mira
 * `instanceof Error` los descarta y muestra un texto genérico que no dice nada.
 * Los tests son básicamente esa distinción.
 */
describe('describeError', () => {
  it('lee un Error común', () => {
    expect(describeError(new Error('Se cayó la conexión'), 'algo salió mal')).toBe(
      'Se cayó la conexión',
    )
  })

  /* El caso para el que existe el módulo. */
  it('lee el objeto plano de Supabase, que no es un Error', () => {
    const deSupabase = {
      message: 'new row violates row-level security policy',
      code: '42501',
      details: null,
      hint: null,
    }
    expect(deSupabase instanceof Error).toBe(false)
    expect(describeError(deSupabase, 'algo salió mal')).toBe(
      'new row violates row-level security policy',
    )
  })

  it('cae en el texto de respaldo cuando lo que llegó no dice nada', () => {
    const respaldo = 'No pudimos guardar los cambios.'
    expect(describeError(null, respaldo)).toBe(respaldo)
    expect(describeError(undefined, respaldo)).toBe(respaldo)
    expect(describeError('un string suelto', respaldo)).toBe(respaldo)
    expect(describeError({ code: '42501' }, respaldo)).toBe(respaldo)
    expect(describeError({ message: 42 }, respaldo)).toBe(respaldo)
  })

  /* Una clase propia que extiende Error tiene que seguir el camino de Error. */
  it('lee los errores propios del dominio', () => {
    class NotAllowedError extends Error {}
    expect(describeError(new NotAllowedError('No es tuyo'), 'x')).toBe('No es tuyo')
  })
})

describe('errorCode', () => {
  it('devuelve el código de Postgres cuando viene', () => {
    expect(errorCode({ message: 'x', code: '23505' })).toBe('23505')
  })

  it('devuelve null cuando no hay código', () => {
    expect(errorCode({ message: 'x' })).toBeNull()
    expect(errorCode(new Error('x'))).toBeNull()
    expect(errorCode(null)).toBeNull()
    /* Un código vacío es lo mismo que no tenerlo: no sirve para diagnosticar. */
    expect(errorCode({ message: 'x', code: '' })).toBeNull()
  })
})
