import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'
import { SUPABASE_PUBLIC } from '../config/supabase-public'

/**
 * Cliente de Supabase, armado a mano con los tres módulos que usamos.
 *
 * La configuración sale de las variables de entorno si están, y si no de los
 * datos públicos que viven en el repo. Eso hace que el sitio funcione recién
 * clonado y recién desplegado, sin configurar nada en ningún panel; el día que
 * haga falta apuntar a otro proyecto, alcanza con un `.env.local`.
 *
 * Ninguno de los dos valores es secreto: ver `src/config/supabase-public.ts`.
 *
 * ---
 *
 * Por qué no `createClient` de `@supabase/supabase-js`:
 *
 * El cliente paraguas arrastra `realtime-js` y `functions-js`, que no usamos.
 * No hay forma de sacarlos —`SupabaseClient` los instancia en el constructor,
 * así que ningún bundler puede probar que sobran— y son 85 kB (23 kB gzip) que
 * paga cada visita, incluso la que sólo mira un aviso.
 *
 * El costo de armarlo a mano es este archivo, que replica lo único que hacía
 * `createClient` y nos importa: pegarle a cada request el token de la sesión.
 * Lo demás —`from`, `rpc`, `storage`, `auth`— son los mismos objetos que
 * exponía el paraguas, así que las pantallas no se enteran.
 */

const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_PUBLIC.url
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_PUBLIC.anonKey

export const isConfigured = Boolean(url && anonKey)

function build() {
  /* La barra final importa: sin ella, `new URL('rest/v1', base)` pisa el
     último segmento del path en vez de agregarse. Con un host pelado da igual,
     pero no si algún día el proyecto vive bajo un subpath. */
  const base = new URL(url.endsWith('/') ? url : `${url}/`)

  /* Tiene que ser exactamente la misma clave que usaba `createClient`, que la
     derivaba así. Si cambia, las sesiones que ya están guardadas en el
     navegador dejan de encontrarse y todo el mundo aparece deslogueado sin que
     nada haya fallado. */
  const storageKey = `sb-${base.hostname.split('.')[0]}-auth-token`

  const auth = new AuthClient({
    url: new URL('auth/v1', base).href,
    /* El cliente de auth va siempre con la anon key: todavía no hay sesión
       cuando pide una. */
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    /* Explícito aunque coincida con el default de la librería: de esto depende
       que el magic link vuelva con la sesión en el fragmento de la URL. */
    flowType: 'implicit',
  })

  /* El corazón del asunto. El token no se puede fijar al construir el cliente
     porque cambia solo: entra alguien, se refresca a los cincuenta minutos,
     se cierra la sesión. Por eso se resuelve por request, que es lo mismo que
     hacía el paraguas. `getSession()` lee de memoria y sólo sale a la red si
     el token venció. Sin sesión viaja la anon key, que es lo que le da a las
     políticas de RLS el rol `anon` para lo que es público. */
  const fetchWithAuth: typeof fetch = async (input, init) => {
    const { data } = await auth.getSession()
    const headers = new Headers(init?.headers)
    if (!headers.has('apikey')) headers.set('apikey', anonKey)
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${data.session?.access_token ?? anonKey}`)
    }
    return fetch(input, { ...init, headers })
  }

  const rest = new PostgrestClient(new URL('rest/v1', base).href, { fetch: fetchWithAuth })
  const storage = new StorageClient(new URL('storage/v1', base).href, {}, fetchWithAuth)

  return {
    auth,
    storage,
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
  }
}

export type Client = ReturnType<typeof build>

/**
 * En la práctica nunca es `null`, porque siempre hay valores por defecto. El
 * tipo se mantiene para que un descuido en la configuración falle con un
 * mensaje claro en `requireSupabase()` y no con un error suelto de la librería.
 */
export const supabase: Client | null = isConfigured ? build() : null

export function requireSupabase(): Client {
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
