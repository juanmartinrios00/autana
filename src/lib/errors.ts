/**
 * Los errores de Supabase no son instancias de `Error`: son objetos planos con
 * `message`, `code`, `details` y `hint`. Un `catch` que sólo mira
 * `instanceof Error` los descarta y termina mostrando un texto genérico que no
 * dice nada, ni al usuario ni a nosotros.
 */

interface ErrorLike {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

function isErrorLike(value: unknown): value is ErrorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  )
}

/** Mensaje legible de cualquier cosa que haya caído en un `catch`. */
export function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message
  if (isErrorLike(cause)) return cause.message
  return fallback
}

/** El código de Postgres o PostgREST, cuando lo hay. Sirve para diagnosticar. */
export function errorCode(cause: unknown): string | null {
  return isErrorLike(cause) && cause.code ? cause.code : null
}
