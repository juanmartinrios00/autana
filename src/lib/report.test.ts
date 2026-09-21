import { describe, expect, it } from 'vitest'
import { armarSobre, destinoDe } from './report'

/**
 * El sobre se arma a mano en vez de con el SDK de Sentry. Si el formato está
 * mal, Sentry lo rechaza en silencio: el sitio sigue andando, los errores no
 * llegan, y nadie se entera de que no se está enterando.
 */
const DSN = 'https://abc123@o456.ingest.sentry.io/789'

describe('destinoDe', () => {
  it('saca el endpoint de sobres del DSN', () => {
    expect(destinoDe(DSN)?.url).toBe(
      'https://o456.ingest.sentry.io/api/789/envelope/?sentry_key=abc123&sentry_version=7',
    )
  })

  it('sin DSN, o con uno roto, no hay destino y no se manda nada', () => {
    expect(destinoDe(undefined)).toBeNull()
    expect(destinoDe('')).toBeNull()
    expect(destinoDe('no es una url')).toBeNull()
    expect(destinoDe('https://o456.ingest.sentry.io/789')).toBeNull()
  })
})

describe('armarSobre', () => {
  const partes = (cause: unknown) =>
    armarSobre(DSN, 'createListing', cause, 'https://auteando.com/vender', 1_700_000_000_000)
      .split('\n')
      .map((linea) => JSON.parse(linea))

  it('son tres líneas: cabecera, tipo y evento, con el mismo id', () => {
    const [cabecera, tipo, evento] = partes(new TypeError('Failed to fetch'))
    expect(cabecera.dsn).toBe(DSN)
    expect(cabecera.event_id).toMatch(/^[0-9a-f]{32}$/)
    expect(evento.event_id).toBe(cabecera.event_id)
    expect(tipo).toEqual({ type: 'event' })
    expect(evento.timestamp).toBe(1_700_000_000)
  })

  it('lleva qué pasó, dónde y en qué pantalla', () => {
    const [, , evento] = partes(new TypeError('Failed to fetch'))
    expect(evento.exception.values[0]).toEqual({ type: 'TypeError', value: 'Failed to fetch' })
    expect(evento.tags.donde).toBe('createListing')
    expect(evento.request.url).toBe('https://auteando.com/vender')
  })

  /* Supabase no rechaza con `Error` sino con un objeto plano. Sin este caso
     llegaría "[object Object]", que es un error que no dice nada. */
  it('entiende los errores de Supabase', () => {
    const [, , evento] = partes({ message: 'new row violates row-level security policy', code: '42501' })
    expect(evento.exception.values[0]).toEqual({
      type: '42501',
      value: 'new row violates row-level security policy',
    })
  })

  it('no manda quién es el usuario', () => {
    const texto = armarSobre(DSN, 'x', new Error('y'), 'https://auteando.com/')
    expect(texto).not.toMatch(/"user"|email|user_id/)
  })
})
