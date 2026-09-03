import type { AuthError, Session as SupabaseSession } from '@supabase/supabase-js'
import { requireSupabase, supabase } from './supabase'
import type { User } from '../types'

/**
 * Autenticación contra Supabase.
 *
 * El camino principal es mail y contraseña, porque no depende de que llegue
 * ningún correo. El magic link queda como alternativa para quien no quiera
 * inventar otra contraseña.
 */

export interface Session {
  user: User
}

type Listener = (session: Session | null) => void

export const MIN_PASSWORD = 8

function toUser(raw: SupabaseSession['user']): User {
  const meta = raw.user_metadata as { name?: string; avatar_url?: string }
  const email = raw.email ?? ''

  return {
    id: raw.id,
    name: meta.name ?? email.split('@')[0] ?? 'Usuario',
    email,
    avatarUrl: meta.avatar_url ?? null,
    role: 'seller',
    createdAt: raw.created_at,
  }
}

function toSession(raw: SupabaseSession | null): Session | null {
  return raw ? { user: toUser(raw.user) } : null
}

/** La sesión inicial llega de forma asíncrona; hasta entonces devuelve `null`. */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return toSession(data.session)
}

export class EmailRateLimitError extends Error {
  constructor() {
    super('Ya mandamos varios mails a esa dirección. Esperá unos minutos.')
    this.name = 'EmailRateLimitError'
  }
}

export class NeedsConfirmationError extends Error {
  constructor() {
    super('Te mandamos un mail para confirmar la cuenta. Abrilo y volvé a entrar.')
    this.name = 'NeedsConfirmationError'
  }
}

/**
 * Traduce los errores de Supabase, que vienen en inglés y a veces filtran
 * detalles que no le sirven a nadie.
 */
function describe(error: AuthError): Error {
  if (error.status === 429) return new EmailRateLimitError()

  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return new Error('El mail o la contraseña no coinciden.')
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return new Error('Ese mail ya tiene cuenta. Probá ingresando.')
  }
  if (message.includes('password should be')) {
    return new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
  }
  if (message.includes('email not confirmed')) {
    return new NeedsConfirmationError()
  }

  return new Error('No pudimos completar la operación. Probá de nuevo en un momento.')
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw describe(error)
}

/**
 * Crea la cuenta. Con la confirmación por mail desactivada en Supabase, la
 * sesión queda abierta al instante; si está activada, Supabase manda un correo
 * y devuelve un usuario sin sesión, que es lo que detecta el segundo caso.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const client = requireSupabase()

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) throw describe(error)
  if (data.user && !data.session) throw new NeedsConfirmationError()
}

/**
 * Manda el magic link. No devuelve sesión: el usuario tiene que abrir el mail.
 * La sesión llega después, por `onAuthChange`, cuando vuelve con el token.
 */
export async function signInWithMagicLink(email: string): Promise<void> {
  const client = requireSupabase()

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  })

  if (error) throw describe(error)
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Cubre login, logout, refresh de token y la vuelta desde el magic link. */
export function onAuthChange(listener: Listener): () => void {
  if (!supabase) return () => {}

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(toSession(session))
  })

  return () => data.subscription.unsubscribe()
}
