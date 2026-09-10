import type { AuthError, Session as SupabaseSession } from '@supabase/auth-js'
import { requireSupabase, supabase } from './supabase'
import type { SellerType, User } from '../types'

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
 *
 * `sellerType` viaja en la metadata del usuario y lo lee el trigger
 * `handle_new_user` (migración 009) para crear el perfil ya con ese tipo. Va
 * por metadata y no por un update posterior a propósito: cuando la
 * confirmación por mail está activada no hay sesión al volver de acá, y un
 * update sin sesión no puede escribir nada. La metadata, en cambio, ya está
 * puesta cuando el trigger corre.
 *
 * Que el valor lo mande el cliente no es un descuido: el tipo de vendedor es
 * autodeclarado también en Ajustes, y hoy sólo define cuántos avisos podés
 * tener vivos. La base igual no le cree — la 009 filtra con lista blanca.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
  sellerType: SellerType = 'private',
): Promise<void> {
  const client = requireSupabase()

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, seller_type: sellerType } },
  })

  if (error) throw describe(error)
  if (data.user && !data.session) throw new NeedsConfirmationError()
}

/**
 * Manda el magic link. No devuelve sesión: el usuario tiene que abrir el mail.
 * La sesión llega después, por `onAuthChange`, cuando vuelve con el token.
 *
 * `profile` viaja igual que en el alta con contraseña, porque este camino
 * también crea cuentas: quien elige "Concesionaria" y después toca el link por
 * mail tiene que terminar siendo concesionaria. Supabase usa esta metadata
 * sólo cuando el usuario no existía; para uno que ya tenía cuenta la ignora, y
 * eso es lo que queremos — nadie se reescribe el perfil pidiendo un link.
 */
export async function signInWithMagicLink(
  email: string,
  profile?: { name?: string; sellerType?: SellerType },
): Promise<void> {
  const client = requireSupabase()

  const data: Record<string, string> = {}
  if (profile?.name) data.name = profile.name
  if (profile?.sellerType) data.seller_type = profile.sellerType

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      ...(Object.keys(data).length > 0 ? { data } : {}),
    },
  })

  if (error) throw describe(error)
}

/**
 * Cambia la contraseña.
 *
 * Pide la actual y la verifica de verdad, iniciando sesión con ella antes de
 * escribir la nueva. Supabase no la exige por su cuenta: `updateUser` acepta
 * una contraseña nueva con sólo tener sesión abierta. Sin este paso, cualquiera
 * que agarre un teléfono desbloqueado con la sesión iniciada deja al dueño
 * afuera de su propia cuenta en dos toques.
 *
 * Quien de verdad olvidó su contraseña no pasa por acá: va por
 * `sendPasswordReset`, que le manda un link al correo. Abrir ese link prueba el
 * control del mail, que es la prueba que corresponde cuando no se sabe la
 * anterior.
 */
export async function changePassword(
  email: string,
  current: string,
  next: string,
): Promise<void> {
  const client = requireSupabase()

  const { error: wrong } = await client.auth.signInWithPassword({ email, password: current })
  if (wrong) throw new Error('La contraseña actual no es correcta.')

  const { error } = await client.auth.updateUser({ password: next })
  if (error) throw describe(error)
}

/**
 * Manda el link para recuperar la contraseña.
 *
 * Es el camino del que la olvidó de verdad: `changePassword` pide la actual, y
 * quien no la sabe no puede usarlo. Abrir un link que llegó al propio correo
 * prueba el control del mail, que es la prueba que corresponde acá.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset`,
  })
  if (error) throw describe(error)
}

/**
 * Escribe la contraseña nueva sin pedir la anterior.
 *
 * Sólo se llama desde la pantalla de recuperación, y sólo después de que
 * Supabase haya emitido `PASSWORD_RECOVERY`. Sin ese recaudo esto seria un
 * agujero: cualquiera con una sesión abierta podría cambiar la contraseña sin
 * saber la vieja, que es justo lo que `changePassword` evita.
 */
export async function setRecoveredPassword(password: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.updateUser({ password })
  if (error) throw describe(error)
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Cubre login, logout, refresh de token y la vuelta desde el magic link. */
/**
 * `event` ya no se descarta: hace falta distinguir `PASSWORD_RECOVERY` de una
 * sesión normal. Las dos dejan al usuario adentro, pero sólo la primera
 * autoriza cambiar la contraseña sin saber la actual.
 */
export function onAuthChange(listener: (session: Session | null, event: string) => void) {
  if (!supabase) return () => {}

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    listener(toSession(session), event)
  })

  return () => data.subscription.unsubscribe()
}
