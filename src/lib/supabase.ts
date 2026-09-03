import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase.
 *
 * Si no hay variables de entorno configuradas, `supabase` queda en `null` y la
 * app sigue andando contra los mocks. Eso permite que cualquiera clone el repo
 * y lo levante sin credenciales, y que el día que falle la config el síntoma
 * sea claro en vez de una pantalla en blanco.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Para los llamados que no tienen sentido sin backend. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Falta configurar Supabase. Copiá .env.example como .env.local y completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

/** La URL pública de una foto, a partir de su ruta en el bucket. */
export function photoUrl(path: string): string {
  if (!supabase) return ''
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}
