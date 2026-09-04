import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLIC } from '../config/supabase-public'

/**
 * Cliente de Supabase.
 *
 * La configuración sale de las variables de entorno si están, y si no de los
 * datos públicos que viven en el repo. Eso hace que el sitio funcione recién
 * clonado y recién desplegado, sin configurar nada en ningún panel; el día que
 * haga falta apuntar a otro proyecto, alcanza con un `.env.local`.
 *
 * Ninguno de los dos valores es secreto: ver `src/config/supabase-public.ts`.
 */

const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_PUBLIC.url
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_PUBLIC.anonKey

export const isConfigured = Boolean(url && anonKey)

/**
 * En la práctica nunca es `null`, porque siempre hay valores por defecto. El
 * tipo se mantiene para que un descuido en la configuración falle con un
 * mensaje claro en `requireSupabase()` y no con un error suelto de la librería.
 */
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Falta la configuración de Supabase. Revisá src/config/supabase-public.ts o definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

/** La URL pública de una foto de publicación, a partir de su ruta en el bucket. */
export function photoUrl(path: string): string {
  if (!supabase) return ''
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}
