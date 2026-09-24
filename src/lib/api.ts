import { PUBLISHED_STATUSES, type AchievementId, type LevelInput } from './levels'
import { computeTrust, type TrustSignal } from './trust'
import { applyVehicleFilters } from './search-query'
import { photoUrl, requireSupabase } from './supabase'
import type {
  Currency,
  GarageSlot,
  ListingStatus,
  Paginated,
  Seller,
  SortOption,
  Vehicle,
  VehicleFilters,
  VehicleImage,
} from '../types'
import type { MakeModelCount } from './suggest'
import { garagePhotoUrl } from './garage'

/**
 * Única capa que habla con el backend. Todo lo que la UI sabe de la red pasa
 * por acá: si mañana esto se muda a un servidor propio en Go, cambia el
 * interior de estas funciones y ninguna pantalla se entera.
 */

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`No encontramos ${what}.`)
    this.name = 'NotFoundError'
  }
}

/**
 * Una escritura que no tocó ninguna fila.
 *
 * RLS no rechaza los UPDATE ni los DELETE: los *filtra*. Si el aviso no es de
 * quien pide el cambio, Postgres no encuentra nada que modificar y devuelve
 * OK con cero filas y sin error. Sin distinguir ese caso, la pantalla
 * festejaría un cambio que nunca ocurrió.
 */
export class NotAllowedError extends Error {
  constructor(what: string) {
    super(`No pudimos ${what}. Puede que tu sesión haya vencido: probá entrar de nuevo.`)
    this.name = 'NotAllowedError'
  }
}

/* ---------------------------------------------------------------------------
   Mapeo de filas a tipos de dominio.
   La base usa snake_case y el dominio camelCase; la traducción vive sólo acá.
--------------------------------------------------------------------------- */

interface ImageRow {
  id: string
  path: string
  position: number
}

interface ListingRow {
  id: string
  slug: string
  seller_id: string
  make: string
  model: string
  trim: string | null
  year: number
  price: number
  currency: Currency
  negotiable: boolean
  /* Desde la 028. Opcionales: sin la migración no vienen. */
  previous_price?: number | null
  price_dropped_at?: string | null
  mileage: number
  condition: Vehicle['condition']
  fuel_type: Vehicle['fuelType']
  transmission: Vehicle['transmission']
  drivetrain: Vehicle['drivetrain'] | null
  body_type: Vehicle['bodyType']
  engine: string | null
  power: number | null
  doors: number | null
  color: string | null
  city: string
  province: string
  description: string
  status: Vehicle['status']
  view_count: number
  favorite_count: number
  interest_count: number
  created_at: string
  updated_at: string
  listing_images?: ImageRow[] | null
  profiles?: { name: string; seller_type: Seller['type'] } | null
}

/* La forma de un perfil tal como se lee publicamente. `whatsapp` no esta y no
   es un olvido: desde la migracion 008 la columna no es legible, y tenerla en
   el tipo dejaria que alguien la pidiera y recibiera `undefined` sin enterarse.
   Que el compilador lo frene es la mitad del arreglo. */
interface ProfileRow {
  id: string
  name: string
  avatar_url: string | null
  seller_type: Seller['type']
  city: string | null
  province: string | null
  verified: boolean
  /** Ya venía en `PROFILE_COLUMNS`; faltaba en el tipo. */
  created_at: string
  /** Público desde la 014. El WhatsApp y el mail de contacto no están, igual que antes. */
  instagram: string | null
  /** El fondo de la cabecera del garage (015). */
  garage_theme: string
  /** Foto y garage ocultos por moderación (018). */
  content_hidden: boolean
}

/* `profiles` a secas es ambiguo: PostgREST ve dos relaciones entre listings y
   profiles (la directa por seller_id y una indirecta a traves de favorites) y
   rechaza la consulta con PGRST201. Nombrar la clave foranea la desambigua. */
const LISTING_COLUMNS =
  '*, listing_images(id, path, position), profiles!listings_seller_id_fkey(name, seller_type)'

function toImages(rows: ImageRow[] | null | undefined, title: string): VehicleImage[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((row, index) => ({
      id: row.id,
      url: photoUrl(row.path),
      alt: `${title} — foto ${index + 1}`,
      order: row.position,
    }))
}

function toVehicle(row: ListingRow): Vehicle {
  const title = [row.make, row.model, row.trim].filter(Boolean).join(' ')

  return {
    id: row.id,
    slug: row.slug,
    sellerId: row.seller_id,
    make: row.make,
    model: row.model,
    trim: row.trim,
    year: row.year,
    price: row.price,
    currency: row.currency,
    negotiable: row.negotiable,
    previousPrice: row.previous_price ?? null,
    priceDroppedAt: row.price_dropped_at ?? null,
    mileage: row.mileage,
    condition: row.condition,
    fuelType: row.fuel_type,
    transmission: row.transmission,
    /* Sin valor por defecto: inventar "Delantera" o "4 puertas" le mostraba al
       comprador un dato que el vendedor nunca dio, y al editar el aviso el
       formulario arrancaba con él y lo guardaba en la base como propio. */
    drivetrain: row.drivetrain ?? null,
    bodyType: row.body_type,
    engine: row.engine ?? '',
    power: row.power,
    doors: row.doors ?? null,
    color: row.color ?? '',
    location: { city: row.city, province: row.province },
    description: row.description,
    images: toImages(row.listing_images, title),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    /* `?? 0` por si la migración 014 todavía no corrió: un aviso sin la
       columna tiene que seguir mostrándose. */
    interestCount: row.interest_count ?? 0,
    sellerName: row.profiles?.name,
    sellerType: row.profiles?.seller_type,
  }
}

/* Las columnas de `profiles` que se pueden leer. Desde la migracion 008 el
   permiso es por columna: `select('*')` falla, y esta bien que falle — es lo
   que avisa que alguien agrego una columna sin decidir si es publica. */
const PROFILE_COLUMNS =
  'id, name, avatar_url, seller_type, city, province, verified, created_at, instagram, garage_theme, content_hidden'

function toSeller(row: ProfileRow, listingCount: number): Seller {
  return {
    id: row.id,
    userId: row.id,
    type: row.seller_type,
    name: row.name || 'Vendedor',
    location: { city: row.city ?? '', province: row.province ?? '' },
    /* Todavía no hay sistema de calificaciones. Null es honesto; un 5.0 por
       defecto sería mentirle al comprador. */
    rating: null,
    reviewCount: 0,
    listingCount,
    verified: row.verified,
  }
}

/* ---------------------------------------------------------------------------
   Consultas
--------------------------------------------------------------------------- */

const orderBy: Record<SortOption, { column: string; ascending: boolean }> = {
  relevance: { column: 'created_at', ascending: false },
  'price-asc': { column: 'price', ascending: true },
  'price-desc': { column: 'price', ascending: false },
  'year-desc': { column: 'year', ascending: false },
  'mileage-asc': { column: 'mileage', ascending: true },
}

/**
 * Las palabras de una busqueda, limpias y listas para entrar en un filtro.
 *
 * PostgREST arma los filtros con una gramatica de texto: la coma separa
 * condiciones, el punto separa campo/operador/valor y los parentesis agrupan.
 * Interpolar lo que escribio el usuario rompia la consulta entera — buscar
 * "Renault, azul" devolvia PGRST100 y la pantalla quedaba en error. Tambien
 * se van `%` y `_`, que son comodines de LIKE. Para una marca o un modelo
 * alcanza con letras, numeros y guion.
 *
 * El tope de terminos evita que pegar un parrafo arme una consulta enorme.
 */
export interface ListVehiclesOptions {
  filters?: VehicleFilters
  sort?: SortOption
  page?: number
  pageSize?: number
}

export async function listVehicles({
  filters = {},
  sort = 'relevance',
  page = 1,
  pageSize = 12,
}: ListVehiclesOptions = {}): Promise<Paginated<Vehicle>> {
  const client = requireSupabase()
  const from = (page - 1) * pageSize

  let query = client
    .from('listings')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('status', 'active')

  /* El tipo de vendedor vive en `profiles`, asi que hay que resolverlo ANTES
     de paginar. Filtrando despues del `.range()` se recortaba la pagina ya
     traida: salian menos de `pageSize` resultados, el total venia sin filtrar
     —con lo cual el paginador mostraba paginas de mas— y quedaban avisos a
     los que no se llegaba desde ninguna pagina. */
  let sellerIds: string[] | undefined
  if (filters.sellerType) {
    sellerIds = (await listSellersOfType(filters.sellerType)).map((seller) => seller.id)
    if (sellerIds.length === 0) return { items: [], total: 0, page, pageSize }
  }

  /* Los filtros los aplica `lib/search-query`, que es el mismo modulo que usa
     el trabajo programado de las busquedas guardadas. Si cada uno tuviera su
     copia, el aviso podria mandar mails por autos que la pantalla no muestra. */
  query = applyVehicleFilters(query, filters, sellerIds)

  const { column, ascending } = orderBy[sort]
  const { data, error, count } = await query
    .order(column, { ascending })
    .range(from, from + pageSize - 1)

  if (error) throw error

  const items = (data as ListingRow[]).map(toVehicle)

  return { items: await withSellerTrust(items), total: count ?? items.length, page, pageSize }
}

/** Adjunta el nivel del vendedor a un lote de avisos, en una sola consulta. */
async function withSellerTrust(items: Vehicle[]): Promise<Vehicle[]> {
  if (items.length === 0) return items

  /* Si la vista todavia no existe o falla, los avisos se muestran igual sin
     el sello: acompania a la decision, no es el contenido. */
  const trust = await getSellerTrust(items.map((item) => item.sellerId)).catch(() => null)
  if (!trust) return items

  return items.map((item) => ({ ...item, sellerTrust: trust.get(item.sellerId) }))
}

async function listSellersOfType(type: Seller['type']): Promise<{ id: string }[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('profiles').select('id').eq('seller_type', type)
  if (error) throw error
  return data
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NotFoundError('esa publicación')

  const [vehicle] = await withSellerTrust([toVehicle(data as ListingRow)])
  return vehicle!
}

export async function getSeller(id: string): Promise<Seller> {
  const client = requireSupabase()

  const [profile, count] = await Promise.all([
    client.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle(),
    client
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', id)
      .eq('status', 'active'),
  ])

  if (profile.error) throw profile.error
  if (!profile.data) throw new NotFoundError('ese vendedor')

  return toSeller(profile.data as ProfileRow, count.count ?? 0)
}

/**
 * Los avisos activos de una persona, para su garage.
 *
 * Sólo activos: un aviso pausado o vendido no se ve en el sitio, así que
 * tampoco en su perfil. Los suyos, en todos los estados, están en
 * `listMyListings`, que es para el panel del dueño.
 */
export async function listSellerVehicles(sellerId: string): Promise<Vehicle[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ListingRow[]).map(toVehicle)
}

export async function setGarageTheme(userId: string, theme: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({ garage_theme: theme })
    .eq('id', userId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('cambiar el color de tu garage')
}

/** Misma carrocería, precio parecido, y nunca el mismo auto. */
export async function getSimilarVehicles(vehicle: Vehicle, limit = 3): Promise<Vehicle[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'active')
    .eq('body_type', vehicle.bodyType)
    .neq('id', vehicle.id)
    .limit(12)

  if (error) throw error

  const similar = (data as ListingRow[])
    .map(toVehicle)
    .sort((a, b) => Math.abs(a.price - vehicle.price) - Math.abs(b.price - vehicle.price))
    .slice(0, limit)

  return withSellerTrust(similar)
}

/**
 * Varios vehiculos por su slug, en una sola consulta.
 *
 * El comparador vive en la URL —`/comparar?ids=corolla-2019-x,cruze-2020-y`—
 * asi que compararlo con alguien es mandarle el link. Por eso van los slugs y
 * no los ids: el que recibe el mensaje ve de que autos se trata antes de
 * abrirlo.
 */
export async function getVehiclesBySlugs(slugs: string[]): Promise<Vehicle[]> {
  if (!slugs.length) return []
  const client = requireSupabase()
  const { data, error } = await client.from('listings').select(LISTING_COLUMNS).in('slug', slugs)
  if (error) throw error
  return withSellerTrust((data as ListingRow[]).map(toVehicle))
}

export async function getVehiclesByIds(ids: string[]): Promise<Vehicle[]> {
  if (!ids.length) return []
  const client = requireSupabase()
  const { data, error } = await client.from('listings').select(LISTING_COLUMNS).in('id', ids)
  if (error) throw error
  return (data as ListingRow[]).map(toVehicle)
}

/* Las tres listas de abajo alimentan los selects de búsqueda. PostgREST no
   hace DISTINCT, así que se deduplica acá; con este volumen no se nota. */

async function distinct(column: 'make' | 'province'): Promise<string[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('listings').select(column).eq('status', 'active')
  if (error) throw error
  const values = (data as Record<string, string>[]).map((row) => row[column])
  return [...new Set(values)].filter(Boolean).sort()
}

export function listMakes(): Promise<string[]> {
  return distinct('make')
}

export function listProvinces(): Promise<string[]> {
  return distinct('province')
}

/**
 * Cada marca y modelo publicado, con cuántos hay: lo que sugiere el buscador
 * de la navbar (`lib/suggest`). Una consulta de dos columnas y se cuenta acá;
 * el buscador la pide una vez, la primera vez que alguien lo toca.
 */
export async function listMakeModels(): Promise<MakeModelCount[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('listings').select('make, model').eq('status', 'active')

  if (error) throw error
  const counts = new Map<string, MakeModelCount>()
  for (const { make, model } of data as { make: string; model: string }[]) {
    if (!make || !model) continue
    const key = JSON.stringify([make, model])
    const found = counts.get(key)
    if (found) found.count += 1
    else counts.set(key, { make, model, count: 1 })
  }
  return [...counts.values()]
}

export async function listModels(make: string): Promise<string[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select('model')
    .eq('status', 'active')
    .eq('make', make)

  if (error) throw error
  const models = (data as { model: string }[]).map((row) => row.model)
  return [...new Set(models)].filter(Boolean).sort()
}

/* ---------------------------------------------------------------------------
   Publicar
--------------------------------------------------------------------------- */

export interface ListingInput {
  make: string
  model: string
  trim: string | null
  year: number
  price: number
  currency: Currency
  negotiable: boolean
  mileage: number
  condition: Vehicle['condition']
  fuelType: Vehicle['fuelType']
  transmission: Vehicle['transmission']
  drivetrain: Vehicle['drivetrain'] | null
  bodyType: Vehicle['bodyType']
  engine: string | null
  doors: number | null
  color: string | null
  city: string
  province: string
  description: string
  whatsapp: string
}

function slugify(value: string): string {
  return [...value.normalize('NFD')]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      return code < 0x300 || code > 0x36f
    })
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Publica el aviso y sube las fotos. Devuelve el vehículo ya guardado. */
export async function createListing(
  input: ListingInput,
  photos: Blob[],
  userId: string,
): Promise<Vehicle> {
  const client = requireSupabase()

  /* Los datos de contacto y ubicación viven en el perfil, no en cada aviso:
     así el vendedor los actualiza una vez y valen para todas sus publicaciones.

     Se pide `.select()` por lo mismo que el resto: si esta escritura la filtra
     RLS, el aviso se publica igual pero sin el WhatsApp nuevo, y el vendedor
     se queda esperando mensajes que no le pueden llegar. */
  const { data: profileRows, error: profileError } = await client
    .from('profiles')
    .update({ whatsapp: input.whatsapp, city: input.city, province: input.province })
    .eq('id', userId)
    .select('id')

  if (profileError) throw profileError
  if (!profileRows || profileRows.length === 0) throw new NotAllowedError('guardar tu contacto')

  const title = [input.make, input.model, input.trim].filter(Boolean).join(' ')
  /* El sufijo aleatorio evita chocar con otro aviso del mismo auto y año. */
  const suffix = Math.random().toString(36).slice(2, 8)

  const { data, error } = await client
    .from('listings')
    .insert({
      slug: `${slugify(title)}-${input.year}-${suffix}`,
      seller_id: userId,
      make: input.make,
      model: input.model,
      trim: input.trim,
      year: input.year,
      price: input.price,
      currency: input.currency,
      negotiable: input.negotiable,
      mileage: input.mileage,
      condition: input.condition,
      fuel_type: input.fuelType,
      transmission: input.transmission,
      drivetrain: input.drivetrain,
      body_type: input.bodyType,
      engine: input.engine,
      doors: input.doors,
      color: input.color,
      city: input.city,
      province: input.province,
      description: input.description,
      status: 'active',
    })
    .select(LISTING_COLUMNS)
    .single()

  if (error) throw error
  const listing = data as ListingRow

  if (photos.length > 0) {
    await uploadListingPhotos(listing.id, userId, photos)
    return getVehicleBySlug(listing.slug)
  }

  return toVehicle(listing)
}

/**
 * Sube las fotos al bucket y las registra.
 *
 * Si alguna falla, las que sí subieron quedan: es preferible una publicación
 * con 6 de 8 fotos a perder todo el trabajo. El vendedor puede completar las
 * que falten editando el aviso.
 */
export async function uploadListingPhotos(
  listingId: string,
  userId: string,
  photos: Blob[],
  startPosition = 0,
): Promise<number> {
  const client = requireSupabase()
  const rows: { listing_id: string; path: string; position: number }[] = []

  for (const [index, blob] of photos.entries()) {
    const position = startPosition + index
    /* El sufijo al azar evita pisar una foto vieja al editar: las posiciones
       se reutilizan cuando se borra alguna del medio, los nombres no. */
    const suffix = Math.random().toString(36).slice(2, 8)
    const path = `${userId}/${listingId}/${position}-${suffix}.webp`
    const { error } = await client.storage
      .from('listing-photos')
      .upload(path, blob, { contentType: 'image/webp', upsert: true })

    if (!error) rows.push({ listing_id: listingId, path, position })
  }

  if (rows.length > 0) {
    const { error } = await client.from('listing_images').insert(rows)
    if (error) throw error
  }

  return rows.length
}

/* ---------------------------------------------------------------------------
   Reportes y moderación
--------------------------------------------------------------------------- */

export type ReportReason = 'scam' | 'sold' | 'duplicate' | 'wrong_data' | 'offensive' | 'other'

export const reportReasons: Record<ReportReason, string> = {
  scam: 'Parece una estafa',
  sold: 'Ya está vendido',
  duplicate: 'Está publicado dos veces',
  wrong_data: 'Los datos no son reales',
  offensive: 'Contenido ofensivo',
  other: 'Otra cosa',
}

/**
 * Reporta una publicación.
 *
 * Exige cuenta: sin identidad, un script manda mil reportes y el sistema no
 * sirve para nada. El índice único de la base garantiza uno por persona y por
 * aviso, así que reportar dos veces choca contra la clave y se traduce a un
 * mensaje claro en vez de a un error crudo.
 */
export async function reportListing(
  listingId: string,
  userId: string,
  reason: ReportReason,
  detail: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('reports').insert({
    listing_id: listingId,
    reporter_id: userId,
    reason,
    detail: detail.trim(),
  })

  if (!error) return
  /* 23505 es violación de unicidad: ya lo había reportado. No es un fallo. */
  if (error.code === '23505') throw new Error('Ya reportaste esta publicación. Gracias.')
  throw error
}

/** Si esta persona ya reportó este aviso, para no ofrecerle hacerlo de nuevo. */
export async function hasReported(listingId: string, userId: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('reports')
    .select('id')
    .eq('listing_id', listingId)
    .eq('reporter_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

/** `true` si la cuenta modera. Sale de la base, no de nada que viva acá. */
export async function isAdmin(): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('is_admin')
  if (error) throw error
  return data === true
}

/* ---------------------------------------------------------------------------
   Reportes de garages y perfiles
--------------------------------------------------------------------------- */

export type ProfileReportReason = 'photo' | 'impersonation' | 'offensive' | 'spam' | 'other'

export const profileReportReasons: Record<ProfileReportReason, string> = {
  photo: 'Tiene una foto inapropiada',
  impersonation: 'Se hace pasar por otra persona',
  offensive: 'Contenido ofensivo',
  spam: 'Es spam o publicidad',
  other: 'Otra cosa',
}

export async function reportProfile(
  profileId: string,
  userId: string,
  reason: ProfileReportReason,
  detail: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('profile_reports').insert({
    profile_id: profileId,
    reporter_id: userId,
    reason,
    detail: detail.trim(),
  })

  if (!error) return
  if (error.code === '23505') throw new Error('Ya reportaste este garage. Gracias.')
  throw error
}

export async function hasReportedProfile(profileId: string, userId: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profile_reports')
    .select('id')
    .eq('profile_id', profileId)
    .eq('reporter_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export interface ReportedProfile {
  profile: ProfileSummary
  reports: { id: string; reason: ProfileReportReason; detail: string; createdAt: string }[]
}

/**
 * Los perfiles reportados, con sus reportes. Igual que con los avisos: sólo
 * devuelve algo para quien modera, porque la política esconde los ajenos.
 */
export async function listReportedProfiles(): Promise<ReportedProfile[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profile_reports')
    .select('id, reason, detail, created_at, profile_id')
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = data as {
    id: string
    reason: ProfileReportReason
    detail: string
    created_at: string
    profile_id: string
  }[]
  if (rows.length === 0) return []

  const ids = [...new Set(rows.map((row) => row.profile_id))]
  const profiles = await Promise.allSettled(ids.map((id) => getProfile(id)))
  const byId = new Map<string, ProfileSummary>()
  profiles.forEach((result) => {
    if (result.status === 'fulfilled') byId.set(result.value.id, result.value)
  })

  const grouped = new Map<string, ReportedProfile>()
  for (const row of rows) {
    const profile = byId.get(row.profile_id)
    if (!profile) continue
    const entry = grouped.get(row.profile_id) ?? { profile, reports: [] }
    entry.reports.push({ id: row.id, reason: row.reason, detail: row.detail, createdAt: row.created_at })
    grouped.set(row.profile_id, entry)
  }

  return [...grouped.values()].sort((a, b) => b.reports.length - a.reports.length)
}

/** Ocultar o volver a mostrar el contenido de un perfil. Sólo quien modera. */
export async function setProfileContentHidden(profileId: string, hidden: boolean): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_set_content_hidden', { target: profileId, hidden })
  if (error) throw error
}

/** Descartar los reportes de un perfil, después de revisarlo. Sólo quien modera. */
export async function dismissProfileReports(profileId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('profile_reports').delete().eq('profile_id', profileId)
  if (error) throw error
}

export interface ReportedListing {
  vehicle: Vehicle
  reports: { id: string; reason: ReportReason; detail: string; createdAt: string }[]
}

/**
 * Las publicaciones reportadas, con sus reportes.
 *
 * Sólo devuelve algo para quien modera: la política de `reports` esconde los
 * ajenos, así que a cualquier otro le llega una lista vacía en vez de un error.
 */
export async function listReportedListings(): Promise<ReportedListing[]> {
  const client = requireSupabase()

  const { data, error } = await client
    .from('reports')
    .select('id, reason, detail, created_at, listing_id')
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = data as {
    id: string
    reason: ReportReason
    detail: string
    created_at: string
    listing_id: string
  }[]

  if (rows.length === 0) return []

  const vehicles = await getVehiclesByIds([...new Set(rows.map((row) => row.listing_id))])
  const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))

  /* Se agrupa por aviso y se ordena por cantidad de reportes: lo más denunciado
     primero, que es lo que hay que mirar antes. */
  const grouped = new Map<string, ReportedListing>()
  for (const row of rows) {
    const vehicle = byId.get(row.listing_id)
    if (!vehicle) continue

    const entry = grouped.get(row.listing_id) ?? { vehicle, reports: [] }
    entry.reports.push({
      id: row.id,
      reason: row.reason,
      detail: row.detail,
      createdAt: row.created_at,
    })
    grouped.set(row.listing_id, entry)
  }

  return [...grouped.values()].sort((a, b) => b.reports.length - a.reports.length)
}

/* ---------------------------------------------------------------------------
   Mensajes de contacto
--------------------------------------------------------------------------- */

export type ContactSubject = 'account' | 'listing' | 'dealers' | 'security' | 'press' | 'other'

export const contactSubjects: Record<ContactSubject, string> = {
  account: 'Ayuda con mi cuenta',
  listing: 'Consulta sobre una publicación',
  dealers: 'Concesionarias y planes',
  security: 'Seguridad o reporte',
  press: 'Prensa y alianzas',
  other: 'Otra consulta',
}

export interface ContactDraft {
  name: string
  email: string
  subject: ContactSubject
  message: string
}

/**
 * Manda un mensaje de contacto.
 *
 * No exige cuenta: "no puedo entrar" es de las razones más comunes para
 * escribir, y pedir sesión dejaría afuera justo ese caso. Si hay sesión, el
 * mensaje queda atado a ella — la política de la 019 no deja mandarlo a nombre
 * de otra persona.
 */
export async function sendContactMessage(draft: ContactDraft, userId: string | null): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('contact_messages').insert({
    user_id: userId,
    name: draft.name.trim(),
    email: draft.email.trim(),
    subject: draft.subject,
    message: draft.message.trim(),
  })

  if (!error) return
  /* 54000 lo levanta el freno por correo de la 019: no es un fallo, es un
     "esperá un rato", y el texto que trae ya está escrito para leerse. */
  if (error.code === '54000') throw new Error(error.message)
  /* 23514 es un check de la tabla. El formulario ya valida lo mismo, así que
     llegar acá quiere decir que se posteó por afuera — pero el texto crudo de
     Postgres nombra constraints y no le sirve a nadie. */
  if (error.code === '23514') {
    throw new Error('Revisá el nombre, el correo y que el mensaje tenga al menos 20 caracteres.')
  }
  throw error
}

export interface ContactMessage {
  id: string
  userId: string | null
  name: string
  email: string
  subject: ContactSubject
  message: string
  handled: boolean
  createdAt: string
}

/**
 * Los mensajes de contacto, sin responder primero.
 *
 * Sólo devuelve algo para quien modera: la política de `contact_messages` no
 * deja leer a nadie más, así que a cualquier otro le llega una lista vacía en
 * vez de un error.
 */
export async function listContactMessages(): Promise<ContactMessage[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('contact_messages')
    .select('id, user_id, name, email, subject, message, handled, created_at')
    .order('handled', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    data as {
      id: string
      user_id: string | null
      name: string
      email: string
      subject: ContactSubject
      message: string
      handled: boolean
      created_at: string
    }[]
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    handled: row.handled,
    createdAt: row.created_at,
  }))
}

/** Marcar un mensaje como respondido, o volver atrás. Sólo quien modera. */
export async function setContactHandled(id: string, handled: boolean): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('contact_messages')
    .update({ handled })
    .eq('id', id)
    .select('id')

  if (error) throw error
  /* Acá pesa más que en otros lados: si a quien modera le sacaron el permiso, o
     se le venció la sesión, el panel marcaba el mensaje como respondido sin
     estarlo. Un mensaje que figura atendido es uno que nadie vuelve a abrir. */
  if (!data || data.length === 0) throw new NotAllowedError('marcar el mensaje')
}

/** Borrar un mensaje. Sólo quien modera. */
export async function deleteContactMessage(id: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('contact_messages').delete().eq('id', id)
  if (error) throw error
}

/* ---------------------------------------------------------------------------
   Favoritos
--------------------------------------------------------------------------- */

/** Los ids de las publicaciones que el usuario guardó. */
export async function listFavoriteIds(userId: string): Promise<string[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as { listing_id: string }[]).map((row) => row.listing_id)
}

/**
 * Guarda un favorito.
 *
 * Va con `upsert` y no con `insert` porque marcar dos veces lo mismo —dos
 * pestañas abiertas, un doble clic— no es un error que le importe a nadie:
 * el favorito ya está, que es lo que el usuario pidió. Con `insert` reventaría
 * contra la clave primaria (user_id, listing_id) y habría que distinguir ese
 * caso de un fallo real.
 */
export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' })

  if (error) throw error
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)

  if (error) throw error
}

/**
 * Vacia la lista entera de una cuenta.
 *
 * Una sola consulta y no una por favorito. Con N consultas, que es como estaba,
 * vaciar una lista de cincuenta autos son cincuenta pedidos en paralelo, y
 * alcanza con que uno falle para que la pantalla quede mintiendo: la vista
 * volvia a mostrar los cincuenta cuando cuarenta y nueve ya no existian. Asi
 * se borra todo o no se borra nada, que es lo unico que se puede deshacer bien.
 *
 * El `eq('user_id')` es del lado del cliente, pero el que manda es el RLS: una
 * fila ajena no entra en el filtro ni aunque se pida.
 */
export async function clearFavorites(userId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('favorites').delete().eq('user_id', userId)

  if (error) throw error
}

/**
 * Sube a la cuenta los favoritos que estaban guardados en el navegador.
 *
 * Se llama al iniciar sesión. Es un merge, no un reemplazo: alguien que venía
 * navegando sin cuenta y marcó tres autos no tiene por qué perderlos, y si ya
 * tenía favoritos en la cuenta tampoco. Los que ya estaban se ignoran por el
 * `upsert`.
 */
export async function mergeFavorites(userId: string, listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return

  const client = requireSupabase()
  const { error } = await client
    .from('favorites')
    .upsert(
      listingIds.map((listingId) => ({ user_id: userId, listing_id: listingId })),
      { onConflict: 'user_id,listing_id' },
    )

  if (error) throw error
}

/* ---------------------------------------------------------------------------
   Gestionar los avisos propios
--------------------------------------------------------------------------- */

/**
 * Guarda los cambios de un aviso que ya existe.
 *
 * El slug NO se toca, aunque cambien la marca, el modelo o el año. Es la
 * identidad pública del aviso: si alguien lo compartió por WhatsApp, ese link
 * tiene que seguir funcionando. Un slug que dice "corolla" en un aviso que
 * ahora dice Hilux es feo; un link roto es peor.
 */
export async function updateListing(id: string, input: ListingInput, userId: string): Promise<Vehicle> {
  const client = requireSupabase()

  /* Igual que al publicar: el contacto y la ubicación viven en el perfil. */
  const { data: profileRows, error: profileError } = await client
    .from('profiles')
    .update({ whatsapp: input.whatsapp, city: input.city, province: input.province })
    .eq('id', userId)
    .select('id')

  if (profileError) throw profileError
  if (!profileRows || profileRows.length === 0) throw new NotAllowedError('guardar tu contacto')

  const { data, error } = await client
    .from('listings')
    .update({
      make: input.make,
      model: input.model,
      trim: input.trim,
      year: input.year,
      price: input.price,
      currency: input.currency,
      negotiable: input.negotiable,
      mileage: input.mileage,
      condition: input.condition,
      fuel_type: input.fuelType,
      transmission: input.transmission,
      drivetrain: input.drivetrain,
      body_type: input.bodyType,
      engine: input.engine,
      doors: input.doors,
      color: input.color,
      city: input.city,
      province: input.province,
      description: input.description,
    })
    .eq('id', id)
    .select(LISTING_COLUMNS)

  if (error) throw error
  const rows = data as ListingRow[] | null
  if (!rows || rows.length === 0) throw new NotAllowedError('guardar los cambios')

  return toVehicle(rows[0]!)
}

/**
 * Saca una foto de un aviso: el archivo del bucket y la fila que lo apunta.
 *
 * Se borra primero el archivo y después la fila. Al revés, un fallo a mitad de
 * camino dejaría una fila apuntando a un archivo que ya no está, y la ficha
 * mostraría una imagen rota.
 */
export async function deleteListingImage(imageId: string): Promise<void> {
  const client = requireSupabase()

  const { data: image, error: readError } = await client
    .from('listing_images')
    .select('path')
    .eq('id', imageId)
    .maybeSingle()

  if (readError) throw readError
  if (!image) return

  await client.storage.from('listing-photos').remove([(image as { path: string }).path])

  const { data, error } = await client
    .from('listing_images')
    .delete()
    .eq('id', imageId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('borrar la foto')
}


/**
 * Todos los avisos del usuario, en cualquier estado.
 *
 * No hace falta filtrar por dueño más allá del `seller_id`: la política de
 * RLS ya deja ver los pausados, vendidos y borradores únicamente a quien los
 * publicó, así que nadie puede espiar los avisos guardados de otro cambiando
 * el id en la URL.
 */
export async function listMyListings(userId: string): Promise<Vehicle[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ListingRow[]).map(toVehicle)
}

/**
 * Pausa un aviso, lo reactiva o lo marca vendido.
 *
 * Es lo que mantiene vivo al marketplace: `listVehicles` sólo trae los
 * activos, así que pausar o marcar vendido lo saca de la búsqueda en el acto,
 * y la política de RLS lo esconde también del link directo. Un clasificado
 * lleno de autos ya vendidos deja de servirle al comprador.
 */
export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .update({ status })
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('actualizar el aviso')
}

/**
 * Borra un aviso y sus fotos.
 *
 * El `on delete cascade` se lleva las filas de `listing_images`, pero no los
 * archivos del bucket: esos hay que borrarlos a mano o quedan ocupando lugar
 * para siempre. Si la limpieza del storage falla, el aviso se borra igual —
 * que alguien no pueda dar de baja su publicación es mucho peor que un puñado
 * de archivos huérfanos.
 */
export async function deleteListing(id: string): Promise<void> {
  const client = requireSupabase()

  const { data: images } = await client
    .from('listing_images')
    .select('path')
    .eq('listing_id', id)

  const paths = (images as { path: string }[] | null)?.map((row) => row.path) ?? []
  if (paths.length > 0) {
    await client.storage.from('listing-photos').remove(paths)
  }

  const { data, error } = await client.from('listings').delete().eq('id', id).select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('borrar el aviso')
}

/* ---------------------------------------------------------------------------
   Secciones de la home
--------------------------------------------------------------------------- */

/** Lo último que se publicó. */
export async function listRecentVehicles(limit = 8): Promise<Vehicle[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return withSellerTrust((data as ListingRow[]).map(toVehicle))
}

/**
 * Los más vistos. Devuelve vacío mientras no haya visitas suficientes: una
 * sección de "populares" con todo en cero no es popularidad, es ruido.
 */
export async function listPopularVehicles(limit = 8, minViews = 1): Promise<Vehicle[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'active')
    .gte('view_count', minViews)
    .order('view_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return withSellerTrust((data as ListingRow[]).map(toVehicle))
}

/** Cuántas publicaciones activas hay por marca o por carrocería. */
export async function countsBy(column: 'make' | 'body_type' | 'province'): Promise<Record<string, number>> {
  const client = requireSupabase()
  const { data, error } = await client.from('listings').select(column).eq('status', 'active')
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data as Record<string, string>[]) {
    const key = row[column]
    if (key) counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export interface MarketplaceStats {
  listings: number
  makes: number
  provinces: number
}

/** Los números del hero. Salen de la base: si hay 3 autos, dice 3. */
export async function getStats(): Promise<MarketplaceStats> {
  const client = requireSupabase()
  const { data, count, error } = await client
    .from('listings')
    .select('make, province', { count: 'exact' })
    .eq('status', 'active')

  if (error) throw error
  const rows = data as { make: string; province: string }[]

  return {
    listings: count ?? rows.length,
    makes: new Set(rows.map((row) => row.make)).size,
    provinces: new Set(rows.map((row) => row.province)).size,
  }
}

/**
 * Suma una visita. Si falla no importa: es una métrica, no el contenido.
 *
 * Una sola por aviso y por pestaña. Sin esto, refrescar la ficha o volver a
 * ella desde "similares" sumaba de nuevo, y "Más vistos" terminaba ordenado
 * por quién recargó más, no por interés real.
 */
export async function registerView(slug: string): Promise<void> {
  const key = `autana:viewed:${slug}`

  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* Storage bloqueado (incógnito estricto, cookies de terceros): se cuenta
       igual. Perder la deduplicación es mejor que perder la métrica. */
  }

  const client = requireSupabase()
  await client.rpc('register_listing_view', { listing_slug: slug })
}

/** Concesionarias con al menos una publicación activa, con su conteo. */
export async function listDealers(limit = 8): Promise<Seller[]> {
  const client = requireSupabase()

  const [profiles, listings] = await Promise.all([
    client.from('profiles').select(PROFILE_COLUMNS).eq('seller_type', 'dealer'),
    client.from('listings').select('seller_id').eq('status', 'active'),
  ])

  if (profiles.error) throw profiles.error
  if (listings.error) throw listings.error

  const counts: Record<string, number> = {}
  for (const row of listings.data as { seller_id: string }[]) {
    counts[row.seller_id] = (counts[row.seller_id] ?? 0) + 1
  }

  return (profiles.data as ProfileRow[])
    .map((row) => toSeller(row, counts[row.id] ?? 0))
    .filter((seller) => seller.listingCount > 0)
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, limit)
}

/* ---------------------------------------------------------------------------
   Perfil
--------------------------------------------------------------------------- */

export interface ProfileSummary {
  id: string
  name: string
  avatarUrl: string | null
  sellerType: Seller['type']
  city: string | null
  province: string | null
  verified: boolean
  /** Cuándo se abrió la cuenta, para "en auteando desde…" (`computeTrust`). */
  memberSince: string
  /** Usuario de Instagram, sin arroba. Es el único dato de contacto público. */
  instagram: string | null
  /** Id del fondo de la cabecera del garage. Ver `lib/garage-theme`. */
  garageTheme: string
  /**
   * La foto de perfil, las fotos y las notas del garage están ocultas por
   * moderación (018). La pantalla no las muestra; quien modera sí las ve.
   */
  contentHidden: boolean
  /** Publicaciones activas. */
  activeListings: number
  /**
   * Activas, pausadas y vendidas. Para los logros: ver `PUBLISHED_STATUSES`.
   * Mirando el perfil de otro da lo mismo que `activeListings`, porque sus
   * pausadas y vendidas no se pueden leer.
   */
  publishedListings: number
  soldListings: number
  /** Fotos de la publicación que más tiene, entre las publicadas. */
  bestPhotoCount: number
}

export async function getProfile(userId: string): Promise<ProfileSummary> {
  const client = requireSupabase()

  const [profile, listings] = await Promise.all([
    client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    client
      .from('listings')
      .select('id, status, listing_images(id)')
      .eq('seller_id', userId)
      .in('status', PUBLISHED_STATUSES),
  ])

  if (profile.error) throw profile.error
  if (!profile.data) throw new NotFoundError('ese perfil')
  if (listings.error) throw listings.error

  const profileRow = profile.data as ProfileRow
  const rows = listings.data as {
    id: string
    status: string
    listing_images: { id: string }[] | null
  }[]

  return {
    id: profileRow.id,
    name: profileRow.name,
    avatarUrl: profileRow.avatar_url
      ? profileRow.avatar_url.startsWith('http')
        ? profileRow.avatar_url
        : photoUrl(profileRow.avatar_url)
      : null,
    sellerType: profileRow.seller_type,
    city: profileRow.city,
    province: profileRow.province,
    verified: profileRow.verified,
    memberSince: profileRow.created_at,
    instagram: profileRow.instagram ?? null,
    garageTheme: profileRow.garage_theme ?? 'ink',
    contentHidden: profileRow.content_hidden ?? false,
    activeListings: rows.filter((row) => row.status === 'active').length,
    publishedListings: rows.length,
    soldListings: rows.filter((row) => row.status === 'sold').length,
    bestPhotoCount: rows.reduce((max, row) => Math.max(max, row.listing_images?.length ?? 0), 0),
  }
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const client = requireSupabase()
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const extension = extensions[file.type]
  if (!extension || file.size > 5 * 1024 * 1024) {
    throw new Error('Formato o tamaño de foto no permitido.')
  }
  const path = `${userId}/avatar/profile-${Date.now()}.${extension}`

  const { error: uploadError } = await client.storage
    .from('listing-photos')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) throw uploadError

  const publicUrl = photoUrl(path)
  const [{ data: profileRows, error: profileError }, { error: authError }] = await Promise.all([
    client.from('profiles').update({ avatar_url: path }).eq('id', userId).select('id'),
    client.auth.updateUser({ data: { avatar_url: publicUrl } }),
  ])

  if (profileError) throw profileError
  if (authError) throw authError
  /* La foto ya está en el bucket; lo que puede no haber pasado es que el perfil
     la apunte. Sin este control la pantalla mostraba la foto nueva ---que sale
     de la respuesta de la subida, no del perfil--- y al recargar volvía la
     vieja, sin ningún aviso en el medio. */
  if (!profileRows || profileRows.length === 0) throw new NotAllowedError('guardar tu foto')

  /* Borrar las fotos anteriores. Cada una se sube con otro nombre, y antes la
     vieja quedaba publicada para siempre: quien cambiaba su foto porque no
     quería que se viera seguía teniéndola abierta para cualquiera con el link.
     Va después de que el perfil apunta a la nueva, así nunca queda apuntando a
     un archivo borrado. Si falla, la foto nueva ya está puesta y la vieja la
     levanta `cleanOrphanPhotos` en la próxima sesión. */
  await removeAllBut('listing-photos', `${userId}/avatar`, [path]).catch(() => {})
  return publicUrl
}

export interface ProfileUpdate {
  name: string
  whatsapp: string
  city: string
  province: string
  sellerType: Seller['type']
  /** Ya normalizado: sin arroba ni link. Vacío se guarda como `null`. */
  instagram: string | null
  contactEmail: string | null
}

export async function updateProfile(userId: string, input: ProfileUpdate): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({
      name: input.name,
      whatsapp: input.whatsapp,
      city: input.city,
      province: input.province,
      seller_type: input.sellerType,
      instagram: input.instagram,
      contact_email: input.contactEmail,
    })
    .eq('id', userId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('guardar tu perfil')
}

/* ---------------------------------------------------------------------------
   Nivel del vendedor
--------------------------------------------------------------------------- */

interface StatsRow {
  user_id: string
  name: string
  city: string | null
  verified: boolean
  created_at: string
  active_listings: number
  best_photos: number
  garage_cars: number
  published_listings: number
  sold_listings: number
}

/** @deprecated El nivel ya no viaja con los avisos. Ver `getSellerTrust`. */
export interface SellerLevel {
  level: number
  title: string
}

/**
 * La señal de confianza de varios vendedores de una sola consulta.
 *
 * Acá antes se calculaba el nivel, que es lo que se mostraba junto al precio.
 * El nivel se gana en parte cargando autos en el garage, así que no era una
 * medida de nada que le sirviera a quien está por escribirle a un desconocido:
 * ver `src/lib/trust.ts`. El nivel sigue existiendo, pero se calcula en el
 * perfil y no viaja con cada aviso.
 *
 * Sin esto habría que pedir los datos de cada vendedor por separado al pintar
 * una grilla.
 */
export async function getSellerTrust(userIds: string[]): Promise<Map<string, TrustSignal>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const client = requireSupabase()
  const { data, error } = await client
    .from('profile_stats')
    .select('user_id, verified, created_at')
    .in('user_id', unique)
  if (error) throw error

  return new Map(
    (data as Pick<StatsRow, 'user_id' | 'verified' | 'created_at'>[]).map((row) => [
      row.user_id,
      computeTrust({ verified: row.verified, memberSince: row.created_at }),
    ]),
  )
}

/* ---------------------------------------------------------------------------
   Busquedas guardadas
--------------------------------------------------------------------------- */

/**
 * Una busqueda guardada es la query string de `/autos` con un nombre.
 *
 * Los filtros ya viven en la URL, asi que no hace falta inventar una
 * representacion nueva: guardar una busqueda es guardar el texto que ya esta en
 * la barra de direcciones, y restaurarla es volver a ponerlo.
 *
 * `notify` existe en la tabla desde el esquema original y NO se expone todavia:
 * avisar por mail cuando aparece un auto que matchea necesita un job programado
 * que corra las consultas y las mande. Un casillero que promete mails que no
 * llegan es peor que no tener el casillero.
 */
export interface SavedSearchRow {
  id: string
  name: string
  query: string
  createdAt: string
}

/* ---------------------------------------------------------------------------
   Buscar personas
--------------------------------------------------------------------------- */

export interface PersonResult {
  id: string
  name: string
  avatarUrl: string | null
  city: string | null
  province: string | null
  /** Cuantos autos tiene cargados. Es lo que desambigua entre dos homonimos. */
  garageCars: number
}

interface PersonRow {
  id: string
  name: string
  avatar_url: string | null
  city: string | null
  province: string | null
  garage_cars: number
}

/** Abajo de esto la busqueda devuelve medio padron y no ayuda a nadie. */
export const MIN_PERSON_TERM = 2

/**
 * Busca personas por nombre.
 *
 * El orden, el tope y el filtro de `discoverable` viven en la funcion
 * `search_people` de la base, no aca: un tope que manda el cliente es un tope
 * que el cliente puede sacar.
 *
 * Devuelve vacio sin ir a la base cuando el termino es muy corto, para no
 * pegarle en cada tecla mientras alguien escribe las primeras letras.
 */
export async function searchPeople(term: string): Promise<PersonResult[]> {
  const clean = term.trim()
  if (clean.length < MIN_PERSON_TERM) return []

  const client = requireSupabase()
  const { data, error } = await client.rpc('search_people', { term: clean })
  if (error) throw error

  return (data as PersonRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url
      ? row.avatar_url.startsWith('http')
        ? row.avatar_url
        : photoUrl(row.avatar_url)
      : null,
    city: row.city,
    province: row.province,
    garageCars: Number(row.garage_cars),
  }))
}

/** Si aparece en el buscador, en el sitemap y en Google. */
export async function getDiscoverable(userId: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('discoverable')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  /* Si la fila no esta, el default de la columna es aparecer. */
  return (data as { discoverable: boolean } | null)?.discoverable ?? true
}

export async function setDiscoverable(userId: string, value: boolean): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({ discoverable: value })
    .eq('id', userId)
    .select('id')

  if (error) throw error
  /* De los que no pueden fallar callados: quien apaga el interruptor para no
     aparecer en el buscador de personas tiene que saber si quedó apagado. */
  if (!data || data.length === 0) throw new NotAllowedError('cambiar tu visibilidad')
}

/* ---------------------------------------------------------------------------
   Seguir y bloquear
--------------------------------------------------------------------------- */

/**
 * La relación entre quien mira y el dueño de un garage.
 *
 * `blockedByMe` y `unavailable` se separan porque la pantalla hace cosas
 * distintas: si bloqueaste vos, se ofrece desbloquear; si te bloqueó el otro,
 * el botón de seguir simplemente no aparece. No se anuncia "esta persona te
 * bloqueó": no le sirve a nadie y convierte un límite en una discusión.
 */
export interface FollowState {
  following: boolean
  blockedByMe: boolean
  /** Hay un bloqueo que no pusiste vos: no se puede seguir. */
  unavailable: boolean
}

export async function getFollowState(userId: string, targetId: string): Promise<FollowState> {
  const client = requireSupabase()

  const [follow, block, either] = await Promise.all([
    client
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId)
      .eq('followed_id', targetId)
      .maybeSingle(),
    client
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .eq('blocked_id', targetId)
      .maybeSingle(),
    /* `blocks` sólo deja leer los propios, así que el bloqueo en la otra
       dirección se pregunta a la base: `blocked_with` responde por los dos
       lados sin mostrar quién puso cuál. */
    client.rpc('blocked_with', { target: targetId }),
  ])

  if (follow.error) throw follow.error
  if (block.error) throw block.error
  if (either.error) throw either.error

  const blockedByMe = Boolean(block.data)
  return {
    following: Boolean(follow.data),
    blockedByMe,
    unavailable: Boolean(either.data) && !blockedByMe,
  }
}

export async function followUser(userId: string, targetId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('follows')
    .insert({ follower_id: userId, followed_id: targetId })

  /* Ya lo seguías —otra pestaña, doble clic—: el resultado es el que se
     pedía, así que no es un error. */
  if (error && error.code !== '23505') throw error
}

export async function unfollowUser(userId: string, targetId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('followed_id', targetId)
  if (error) throw error
}

/** Bloquear corta el seguimiento en las dos direcciones: lo hace un trigger en la base. */
export async function blockUser(userId: string, targetId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: targetId })
  if (error && error.code !== '23505') throw error
}

export async function unblockUser(userId: string, targetId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', targetId)
  if (error) throw error
}

export interface FollowCounts {
  followers: number
  following: number
}

/** Públicas: cuántos, nunca quiénes. */
export async function getFollowCounts(targetId: string): Promise<FollowCounts> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('follow_counts', { target: targetId })
  if (error) throw error
  const row = (data as { followers: number; following: number }[])[0]
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) }
}

export interface FollowedPerson extends PersonResult {
  /** Última vez que tocó su garage. `null` si todavía no cargó nada. */
  updatedAt: string | null
}

function avatarFrom(path: string | null): string | null {
  if (!path) return null
  return path.startsWith('http') ? path : photoUrl(path)
}

/** A quién sigo, con el que cambió su garage más recientemente primero. */
export async function listFollowing(): Promise<FollowedPerson[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_following')
  if (error) throw error

  return (data as (PersonRow & { updated_at: string | null })[]).map((row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: avatarFrom(row.avatar_url),
    city: row.city,
    province: row.province,
    garageCars: Number(row.garage_cars),
    updatedAt: row.updated_at,
  }))
}

export interface BlockedPerson {
  id: string
  name: string
  avatarUrl: string | null
}

export async function listBlocked(): Promise<BlockedPerson[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_blocks')
  if (error) throw error

  return (data as { id: string; name: string; avatar_url: string | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: avatarFrom(row.avatar_url),
  }))
}

/* ---------------------------------------------------------------------------
   Novedades
--------------------------------------------------------------------------- */

export type NovedadKind = 'interest' | 'follow' | 'garage' | 'price_drop'

/**
 * Algo que pasó con lo propio. Se calculan en la base al pedirlas (migración
 * 016), así que no hay ids: lo que las identifica es qué pasó y cuándo.
 */
export interface Novedad {
  kind: NovedadKind
  happenedAt: string
  /** Pasó después de la última vez que se abrió la pantalla. */
  unseen: boolean
  /** Quién. `null` en los interesados, que nunca dicen quién. */
  actor: { id: string; name: string; avatarUrl: string | null } | null
  listing: { slug: string; title: string } | null
  /** Cuántos interesados. En las de garage siempre 1: una por auto. */
  amount: number
  /**
   * Sólo en las de garage: qué auto cargó o cambió, con su foto y su nota.
   * Antes la novedad decía "actualizó su garage" y el dato ya estaba guardado.
   * La foto y la nota vienen vacías si el perfil está oculto por moderación.
   */
  garage: {
    slot: GarageSlot
    car: string
    photoUrl: string
    note: string
    /** Recién cargado, o uno que ya estaba y cambió. */
    isNew: boolean
  } | null
  /** Sólo en las de rebaja (028): el precio de ahora y el de antes. */
  price: { now: number; before: number; currency: Currency } | null
}

interface NovedadRow {
  kind: NovedadKind
  happened_at: string
  unseen: boolean
  actor_id: string | null
  actor_name: string | null
  actor_avatar: string | null
  listing_slug: string | null
  listing_title: string | null
  amount: number
  garage_slot: GarageSlot | null
  garage_car: string | null
  garage_photo: string | null
  garage_note: string | null
  garage_is_new: boolean | null
  price_now?: number | null
  price_before?: number | null
  price_currency?: Currency | null
}

export async function listNovedades(): Promise<Novedad[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_novedades')
  if (error) throw error

  return (data as NovedadRow[]).map((row) => ({
    kind: row.kind,
    happenedAt: row.happened_at,
    unseen: row.unseen,
    actor: row.actor_id
      ? { id: row.actor_id, name: row.actor_name ?? '', avatarUrl: avatarFrom(row.actor_avatar) }
      : null,
    listing: row.listing_slug ? { slug: row.listing_slug, title: row.listing_title ?? '' } : null,
    amount: Number(row.amount),
    garage: row.garage_slot
      ? {
          slot: row.garage_slot,
          car: row.garage_car ?? '',
          photoUrl: garagePhotoUrl(row.garage_photo),
          note: row.garage_note ?? '',
          isNew: Boolean(row.garage_is_new),
        }
      : null,
    price:
      row.price_now != null && row.price_before != null && row.price_currency
        ? { now: row.price_now, before: row.price_before, currency: row.price_currency }
        : null,
  }))
}

/**
 * Los logros ganados de un perfil, para las medallas del garage.
 *
 * Sale de la base (026) y no de `computeLevel` porque dos de los siete miran
 * datos que sólo ve su dueño: el WhatsApp y los avisos vendidos. La función
 * devuelve la lista de ganados y nada más.
 */
export async function getProfileBadges(userId: string): Promise<AchievementId[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('profile_badges', { target: userId })
  if (error) throw error
  return (data as AchievementId[] | null) ?? []
}

/** Un día de un aviso: cuántos lo miraron y cuántos pidieron el contacto. */
export interface ListingDay {
  day: string
  views: number
  interests: number
}

/**
 * Los últimos días de cada aviso propio (027), agrupados por aviso.
 *
 * La función de la base devuelve sólo filas con movimiento: los días en que
 * nadie entró no existen. La pantalla rellena los huecos, porque un día en
 * cero es un dato y no un agujero.
 */
export async function getMyListingStats(days = 14): Promise<Record<string, ListingDay[]>> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_listing_stats', { days })
  if (error) throw error

  const porAviso: Record<string, ListingDay[]> = {}
  for (const row of (data ?? []) as { listing_id: string; day: string; views: number; interests: number }[]) {
    const lista = porAviso[row.listing_id] ?? []
    lista.push({ day: row.day, views: Number(row.views), interests: Number(row.interests) })
    porAviso[row.listing_id] = lista
  }
  return porAviso
}

export async function markNovedadesSeen(): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('mark_novedades_seen')
  if (error) throw error
}

export async function listSavedSearches(userId: string): Promise<SavedSearchRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('saved_searches')
    .select('id, name, query, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as { id: string; name: string; query: string; created_at: string }[]).map(
    (row) => ({ id: row.id, name: row.name, query: row.query, createdAt: row.created_at }),
  )
}

export async function saveSearch(userId: string, name: string, query: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('saved_searches')
    .insert({ user_id: userId, name, query })
  if (error) throw error
}

export async function removeSavedSearch(id: string): Promise<void> {
  const client = requireSupabase()
  /* RLS filtra en vez de rechazar, asi que un `delete` sobre una fila ajena
     devuelve OK con cero filas. El `select()` es lo que deja notar la
     diferencia. */
  const { data, error } = await client.from('saved_searches').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('borrar esa búsqueda')
}

/**
 * El WhatsApp del vendedor de un aviso.
 *
 * Va por una funcion de la base y no por una columna porque `profiles` dejo de
 * exponer el numero: cualquiera podia bajarse nombre + celular + ciudad de
 * todos los usuarios en una sola consulta. Ahora cuesta un aviso activo por
 * numero. Ver `008_whatsapp_no_enumerable.sql`.
 *
 * Devuelve `null` si el aviso no esta activo, que es lo correcto: un aviso
 * bloqueado esta bloqueado por algo.
 */
/* ---------------------------------------------------------------------------
   Me interesa, y el contacto
--------------------------------------------------------------------------- */

/**
 * El contacto de quien publicó, tal como lo devuelve "Me interesa".
 *
 * Cualquiera de los tres puede venir vacío: son opcionales. Que vengan los tres
 * vacíos también puede pasar, y la pantalla lo dice en vez de mostrar un panel
 * en blanco.
 */
export interface SellerContact {
  sellerName: string
  whatsapp: string | null
  instagram: string | null
  contactEmail: string | null
  /** El número actualizado, ya contando este toque si era el primero. */
  interestCount: number
}

/**
 * Se llegó al tope diario de contactos nuevos (migración 014). Se separa del
 * resto de los errores porque la pantalla dice qué pasó y cuándo se destraba,
 * en vez de un "algo salió mal".
 */
export class ContactLimitError extends Error {}

function isContactLimit(error: { code?: string; hint?: string | null }): boolean {
  return error.code === 'PT429' || error.hint === 'contact_limit'
}

/**
 * Tocar "Me interesa": anota el interés y devuelve el contacto, en una sola
 * llamada. Si fueran dos se podría pedir el contacto sin sumar, y el número
 * público dejaría de decir cuánta gente contactó.
 *
 * `null` si el aviso ya no está activo.
 */
export async function expressInterest(slug: string): Promise<SellerContact | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('express_interest', { p_slug: slug })
  if (error) {
    if (isContactLimit(error)) throw new ContactLimitError(error.message)
    throw error
  }

  const row = (data as {
    seller_name: string
    whatsapp: string | null
    instagram: string | null
    contact_email: string | null
    interest_count: number
  }[])[0]
  if (!row) return null

  return {
    sellerName: row.seller_name,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    contactEmail: row.contact_email,
    interestCount: Number(row.interest_count),
  }
}

/** Si ya tocó "Me interesa" en este aviso, para que el botón lo diga. */
export async function hasInterest(userId: string, listingId: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('listing_interests')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

/**
 * WhatsApp y mail de una persona, para quien tiene sesión. `null` si no cargó
 * ninguno de los dos — y en ese caso no gasta tope.
 */
export async function getProfileContact(
  targetId: string,
): Promise<{ whatsapp: string | null; contactEmail: string | null } | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('profile_contact', { target: targetId })
  if (error) {
    if (isContactLimit(error)) throw new ContactLimitError(error.message)
    throw error
  }
  const row = (data as { whatsapp: string | null; contact_email: string | null }[])[0]
  return row ? { whatsapp: row.whatsapp, contactEmail: row.contact_email } : null
}

/** Los datos de contacto propios, para Ajustes. */
export async function getMyContact(): Promise<{
  whatsapp: string | null
  instagram: string | null
  contactEmail: string | null
}> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_contact')
  if (error) throw error
  const row = (data as { whatsapp: string | null; instagram: string | null; contact_email: string | null }[])[0]
  return {
    whatsapp: row?.whatsapp ?? null,
    instagram: row?.instagram ?? null,
    contactEmail: row?.contact_email ?? null,
  }
}

/** El propio numero. La funcion resuelve de quien es con `auth.uid()`, asi que
 *  no hay parametro que manipular. */
export async function getOwnWhatsapp(): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('my_whatsapp')
  if (error) throw error
  return (data as string | null) ?? null
}

/** Cambia solo el tipo de vendedor. Antes esto reenviaba el perfil entero, y
 *  desde que el numero no se puede leer eso lo habria borrado. */
export async function updateSellerType(userId: string, type: Seller['type']): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({ seller_type: type })
    .eq('id', userId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new NotAllowedError('cambiar el tipo de vendedor')
}

/**
 * Todo lo que `computeLevel` necesita, en una sola consulta.
 *
 * `profile_stats` ya trae los contadores y los tres campos que definen el
 * perfil completo, así que la pantalla de niveles no necesita pedir el perfil
 * por separado ni contar el garage a mano.
 */
export async function getLevelInput(userId: string): Promise<LevelInput> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profile_stats')
    .select('name, city, active_listings, published_listings, sold_listings, best_photos, garage_cars')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  const row = data as Omit<StatsRow, 'user_id' | 'verified' | 'created_at'> | null
  /* Si esta cargado, no cual es: el logro solo necesita saber eso, y el unico
     que puede preguntarlo es el propio dueno. */
  const hasWhatsapp = Boolean(await getOwnWhatsapp().catch(() => null))

  return {
    profile: row ? { name: row.name, hasWhatsapp, city: row.city } : null,
    activeListings: row?.active_listings ?? 0,
    publishedListings: row?.published_listings ?? 0,
    soldListings: row?.sold_listings ?? 0,
    bestPhotoCount: row?.best_photos ?? 0,
    garageCars: row?.garage_cars ?? 0,
  }
}

/* ---------------------------------------------------------------------------
   Borrar la cuenta
--------------------------------------------------------------------------- */

/** Los dos buckets donde un usuario deja archivos, los dos bajo `<userId>/`. */
const OWN_BUCKETS = ['listing-photos', 'garage-photos'] as const

/**
 * Vacía una carpeta de Storage, y las de adentro.
 *
 * `list` no es recursivo y las fotos de los avisos están dos niveles abajo
 * (`<userId>/<listingId>/…`, y el avatar en `<userId>/avatar/…`), así que hay
 * que bajar. Las entradas que son carpeta vienen con `id` en null: es lo único
 * que las distingue de un archivo.
 *
 * Se listan los archivos en vez de calcular las rutas desde la base a propósito:
 * así también se lleva lo que quedó colgado de una subida que se cortó a la
 * mitad y nunca llegó a `listing_images`.
 */
/**
 * Borra los archivos de una carpeta que no están en `keep`. Sólo el primer
 * nivel: las carpetas de avatar y de garage no tienen subcarpetas.
 *
 * Devuelve cuántos borró.
 */
async function removeAllBut(bucket: string, prefix: string, keep: string[]): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return 0

  const kept = new Set(keep)
  const stale = data
    .filter((entry) => entry.id !== null)
    .map((entry) => `${prefix}/${entry.name}`)
    .filter((path) => !kept.has(path))

  if (stale.length === 0) return 0
  const { error: removeError } = await client.storage.from(bucket).remove(stale)
  if (removeError) throw removeError
  return stale.length
}

/**
 * La ruta dentro del bucket a partir de lo que guardó la base, que puede ser
 * la ruta o la URL pública entera (las cuentas viejas guardaban la URL).
 */
function storagePath(bucket: string, value: string | null): string | null {
  if (!value) return null
  const marker = `/object/public/${bucket}/`
  const at = value.indexOf(marker)
  if (at !== -1) return decodeURIComponent(value.slice(at + marker.length))
  return value.startsWith('http') ? null : value
}

/**
 * Borra las fotos propias que ya no usa nada: avatares viejos y fotos de autos
 * que se sacaron del garage.
 *
 * Existe porque durante un tiempo esas dos cosas no borraban el archivo, y hay
 * fotos que la persona cree borradas y siguen publicadas. Corre una vez por
 * sesión, desde el cliente de la propia persona, porque las políticas de
 * Storage sólo dejan borrar lo de la propia carpeta: una limpieza general
 * necesitaría la clave de servicio, que acá no existe a propósito.
 *
 * Nunca borra lo que está en uso: se lee de la base qué avatar y qué fotos del
 * garage están puestos, y se conserva exactamente eso.
 */
export async function cleanOrphanPhotos(userId: string): Promise<number> {
  const client = requireSupabase()

  const [profile, garage] = await Promise.all([
    client.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
    client.from('garage_entries').select('photo_path').eq('user_id', userId),
  ])
  /* Sin poder leer qué está en uso no se borra nada: mejor dejar una huérfana
     que borrar la foto de alguien. */
  if (profile.error || garage.error) return 0

  const avatar = storagePath(
    'listing-photos',
    (profile.data as { avatar_url: string | null } | null)?.avatar_url ?? null,
  )
  const garagePhotos = ((garage.data as { photo_path: string | null }[]) ?? [])
    .map((row) => row.photo_path)
    .filter((path): path is string => Boolean(path))

  const [avatars, cars] = await Promise.all([
    removeAllBut('listing-photos', `${userId}/avatar`, avatar ? [avatar] : []),
    removeAllBut('garage-photos', userId, garagePhotos),
  ])
  return avatars + cars
}

async function emptyFolder(bucket: string, prefix: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return

  const files: string[] = []
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`
    if (entry.id === null) await emptyFolder(bucket, path)
    else files.push(path)
  }

  if (files.length > 0) {
    const { error: removeError } = await client.storage.from(bucket).remove(files)
    if (removeError) throw removeError
  }
}

/**
 * Borra la cuenta y todo lo que cuelga de ella.
 *
 * El orden importa. Las fotos van primero porque son lo único que la cascada de
 * la base no alcanza: viven en Storage, y las políticas que dejan borrarlas
 * miran `auth.uid()`. Una vez que la cuenta no existe, no hay sesión, no hay
 * `auth.uid()` y esos archivos quedan huérfanos para siempre — nadie tiene
 * permiso de tocarlos.
 *
 * Si el borrado de fotos falla, esto corta antes de llamar a la base: es
 * preferible una cuenta que sigue en pie y se puede reintentar, a una cuenta
 * borrada con las fotos colgadas.
 *
 * Después va `delete_my_account` (migración 010), que borra la fila de
 * `auth.users` y arrastra el resto por foreign key.
 *
 * Y antes de todo eso va la sonda, porque el orden no se puede invertir para
 * cubrirse: si la cuenta se fuera primero, no habría sesión para borrar las
 * fotos y quedarían públicas sin que nadie pueda sacarlas.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const client = requireSupabase()

  /* Preguntar antes de romper nada. `account_deletion_ready` no hace nada y
     nace en el mismo archivo que `delete_my_account`, así que si contesta es
     porque la migración está aplicada y PostgREST ya la tiene en su caché de
     esquema — que tarda unos segundos en refrescarse después de crear una
     función. Sin esta sonda, ese hueco borra las fotos y deja la cuenta viva. */
  const { error: notReady } = await client.rpc('account_deletion_ready')
  if (notReady) throw new Error('El borrado de cuenta no está disponible en este momento.')

  for (const bucket of OWN_BUCKETS) {
    await emptyFolder(bucket, userId)
  }

  const { error } = await client.rpc('delete_my_account')
  if (error) throw error
}
