/**
 * Ayudas para los tests contra Supabase local.
 *
 * Estos tests existen para lo que no se puede probar de otra forma: lo que
 * depende de quién está logueado. Las políticas de RLS, los permisos por
 * columna, las funciones `security definer`. Contra la base real no se puede
 * —no hay sesión con la anon key, y crear usuarios de prueba en producción
 * ensucia la base de verdad—, y con mocks se prueba el mock, no la política.
 *
 * Hablan HTTP directo con la API, igual que la aplicación, en vez de importar
 * el cliente: lo que se prueba es lo que la base deja hacer a cualquiera que
 * tenga un token, no lo que la pantalla decide pedir.
 *
 * Se corren con `npm run test:db`, que levanta la base local, le aplica
 * `schema.sql` y todas las migraciones desde cero, y pasa las claves por
 * variables de entorno. Ver `scripts/db-test.mjs`.
 */

const URL_BASE = process.env.DB_TEST_URL
const ANON = process.env.DB_TEST_ANON_KEY
const SERVICE = process.env.DB_TEST_SERVICE_KEY

if (!URL_BASE || !ANON || !SERVICE) {
  throw new Error('Faltan DB_TEST_URL / DB_TEST_ANON_KEY / DB_TEST_SERVICE_KEY. Corré `npm run test:db`.')
}

export interface Answer<T = unknown> {
  status: number
  body: T
}

export interface TestUser {
  id: string
  email: string
  token: string
}

async function call<T>(
  method: string,
  path: string,
  apikey: string,
  bearer: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Answer<T>> {
  const response = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: {
      apikey,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }
  return { status: response.status, body: parsed as T }
}

/** La API REST como un usuario con sesión, o sin sesión si `token` es null. */
export function rest<T = unknown>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<Answer<T>> {
  return call<T>(method, `/rest/v1/${path}`, ANON!, token ?? ANON!, body, headers)
}

/** Llamar una función de la base. */
export function rpc<T = unknown>(name: string, args: object, token: string | null): Promise<Answer<T>> {
  return rest<T>('POST', `rpc/${name}`, token, args)
}

/**
 * Como quien administra la base: saltea RLS. Sólo para preparar y para leer el
 * resultado de un test, nunca para la acción que se está probando.
 */
export function asService<T = unknown>(method: string, path: string, body?: unknown): Promise<Answer<T>> {
  return call<T>(method, `/rest/v1/${path}`, SERVICE!, SERVICE!, body, {
    Prefer: 'return=representation',
  })
}

export function storage<T = unknown>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<Answer<T>> {
  return call<T>(method, `/storage/v1/${path}`, ANON!, token, body)
}

let counter = 0

/**
 * Un usuario nuevo, con sesión. Cada test usa los suyos: así ninguno depende del
 * estado que dejó otro.
 */
export async function newUser(name = 'Test', meta: Record<string, string> = {}): Promise<TestUser> {
  counter += 1
  const email = `t${Date.now()}${counter}${Math.random().toString(36).slice(2, 6)}@test.local`
  const answer = await call<{ access_token: string; user: { id: string } }>(
    'POST',
    '/auth/v1/signup',
    ANON!,
    ANON!,
    { email, password: 'contraseña-de-prueba-123', data: { name, ...meta } },
  )
  if (answer.status >= 300 || !answer.body?.access_token) {
    throw new Error(`No se pudo crear el usuario de prueba: ${answer.status} ${JSON.stringify(answer.body)}`)
  }
  return { id: answer.body.user.id, email, token: answer.body.access_token }
}

/** Un aviso activo del usuario, con lo que carga la pantalla de publicar. */
export async function newListing(
  owner: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; slug: string }> {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const answer = await rest<{ id: string; slug: string }[]>(
    'POST',
    'listings?select=id,slug',
    owner.token,
    {
      slug,
      seller_id: owner.id,
      make: 'Toyota',
      model: 'Hilux',
      trim: 'SRV',
      year: 2019,
      price: 30000,
      negotiable: false,
      mileage: 80000,
      condition: 'used',
      fuel_type: 'diesel',
      transmission: 'manual',
      drivetrain: 'awd',
      body_type: 'pickup',
      engine: '2.8',
      doors: 4,
      color: 'Blanco',
      city: 'Córdoba',
      province: 'Córdoba',
      description: 'Aviso de prueba',
      status: 'active',
      ...overrides,
    },
    { Prefer: 'return=representation' },
  )
  if (answer.status >= 300 || !answer.body?.[0]) {
    throw new Error(`No se pudo crear el aviso de prueba: ${answer.status} ${JSON.stringify(answer.body)}`)
  }
  return answer.body[0]
}

/** Leer una fila salteando RLS, para comprobar qué quedó escrito de verdad. */
export async function readAsService<T>(table: string, filter: string, columns = '*'): Promise<T | undefined> {
  const answer = await asService<T[]>('GET', `${table}?select=${columns}&${filter}`)
  return answer.body?.[0]
}
