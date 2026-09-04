import { computeLevel } from './levels'
import { photoUrl, requireSupabase } from './supabase'
import type {
  Paginated,
  Seller,
  SortOption,
  Vehicle,
  VehicleFilters,
  VehicleImage,
} from '../types'

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
  currency: 'USD' | 'ARS'
  negotiable: boolean
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
  created_at: string
  updated_at: string
  listing_images?: ImageRow[] | null
  profiles?: { name: string; seller_type: Seller['type'] } | null
}

interface ProfileRow {
  id: string
  name: string
  seller_type: Seller['type']
  city: string | null
  province: string | null
  whatsapp: string | null
  verified: boolean
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
    mileage: row.mileage,
    condition: row.condition,
    fuelType: row.fuel_type,
    transmission: row.transmission,
    drivetrain: row.drivetrain ?? 'fwd',
    bodyType: row.body_type,
    engine: row.engine ?? '',
    power: row.power,
    doors: row.doors ?? 4,
    color: row.color ?? '',
    location: { city: row.city, province: row.province },
    description: row.description,
    images: toImages(row.listing_images, title),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    sellerName: row.profiles?.name,
    sellerType: row.profiles?.seller_type,
  }
}

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
    whatsapp: row.whatsapp,
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

  if (filters.q) query = query.or(`make.ilike.%${filters.q}%,model.ilike.%${filters.q}%`)
  if (filters.make) query = query.eq('make', filters.make)
  if (filters.model) query = query.eq('model', filters.model)
  if (filters.province) query = query.eq('province', filters.province)
  if (filters.minYear) query = query.gte('year', filters.minYear)
  if (filters.maxYear) query = query.lte('year', filters.maxYear)
  if (filters.minPrice) query = query.gte('price', filters.minPrice)
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
  if (filters.maxMileage !== undefined) query = query.lte('mileage', filters.maxMileage)
  if (filters.transmission) query = query.eq('transmission', filters.transmission)
  if (filters.fuelType?.length) query = query.in('fuel_type', filters.fuelType)
  if (filters.bodyType?.length) query = query.in('body_type', filters.bodyType)
  if (filters.condition?.length) query = query.in('condition', filters.condition)

  const { column, ascending } = orderBy[sort]
  const { data, error, count } = await query
    .order(column, { ascending })
    .range(from, from + pageSize - 1)

  if (error) throw error

  let items = (data as ListingRow[]).map(toVehicle)

  /* El tipo de vendedor vive en `profiles`, así que no se puede filtrar en la
     misma consulta sin un join. A esta escala alcanza con filtrar acá; cuando
     el volumen lo pida, se resuelve con una vista en la base. */
  if (filters.sellerType) {
    const sellerIds = new Set(
      (await listSellersOfType(filters.sellerType)).map((seller) => seller.id),
    )
    items = items.filter((vehicle) => sellerIds.has(vehicle.sellerId))
  }

  return { items: await withSellerLevels(items), total: count ?? items.length, page, pageSize }
}

/** Adjunta el nivel del vendedor a un lote de avisos, en una sola consulta. */
async function withSellerLevels(items: Vehicle[]): Promise<Vehicle[]> {
  if (items.length === 0) return items

  /* Si la vista todavia no existe o falla, los avisos se muestran igual sin
     el sello: es un adorno de confianza, no el contenido. */
  const levels = await getSellerLevels(items.map((item) => item.sellerId)).catch(() => null)
  if (!levels) return items

  return items.map((item) => ({ ...item, sellerLevel: levels.get(item.sellerId) }))
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

  const [vehicle] = await withSellerLevels([toVehicle(data as ListingRow)])
  return vehicle!
}

export async function getSeller(id: string): Promise<Seller> {
  const client = requireSupabase()

  const [profile, count] = await Promise.all([
    client.from('profiles').select('*').eq('id', id).maybeSingle(),
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

  return withSellerLevels(similar)
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

export interface NewListing {
  make: string
  model: string
  trim: string | null
  year: number
  price: number
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
  input: NewListing,
  photos: Blob[],
  userId: string,
): Promise<Vehicle> {
  const client = requireSupabase()

  /* Los datos de contacto y ubicación viven en el perfil, no en cada aviso:
     así el vendedor los actualiza una vez y valen para todas sus publicaciones. */
  const { error: profileError } = await client
    .from('profiles')
    .update({ whatsapp: input.whatsapp, city: input.city, province: input.province })
    .eq('id', userId)

  if (profileError) throw profileError

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
): Promise<number> {
  const client = requireSupabase()
  const rows: { listing_id: string; path: string; position: number }[] = []

  for (const [index, blob] of photos.entries()) {
    const path = `${userId}/${listingId}/${index}.webp`
    const { error } = await client.storage
      .from('listing-photos')
      .upload(path, blob, { contentType: 'image/webp', upsert: true })

    if (!error) rows.push({ listing_id: listingId, path, position: index })
  }

  if (rows.length > 0) {
    const { error } = await client.from('listing_images').insert(rows)
    if (error) throw error
  }

  return rows.length
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
  return withSellerLevels((data as ListingRow[]).map(toVehicle))
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
  return (data as ListingRow[]).map(toVehicle)
}

/** Cuántas publicaciones activas hay por marca o por carrocería. */
export async function countsBy(column: 'make' | 'body_type'): Promise<Record<string, number>> {
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

/** Suma una visita. Si falla no importa: es una métrica, no el contenido. */
export async function registerView(slug: string): Promise<void> {
  const client = requireSupabase()
  await client.rpc('register_listing_view', { listing_slug: slug })
}

/** Concesionarias con al menos una publicación activa, con su conteo. */
export async function listDealers(limit = 8): Promise<Seller[]> {
  const client = requireSupabase()

  const [profiles, listings] = await Promise.all([
    client.from('profiles').select('*').eq('seller_type', 'dealer'),
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
  sellerType: Seller['type']
  city: string | null
  province: string | null
  whatsapp: string | null
  verified: boolean
  /** Publicaciones activas. */
  activeListings: number
  /** Fotos de la publicación que más tiene. Alimenta el logro correspondiente. */
  bestPhotoCount: number
}

export async function getProfile(userId: string): Promise<ProfileSummary> {
  const client = requireSupabase()

  const [profile, listings] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client
      .from('listings')
      .select('id, status, listing_images(id)')
      .eq('seller_id', userId)
      .eq('status', 'active'),
  ])

  if (profile.error) throw profile.error
  if (!profile.data) throw new NotFoundError('ese perfil')
  if (listings.error) throw listings.error

  const rows = listings.data as { id: string; listing_images: { id: string }[] | null }[]

  return {
    id: (profile.data as ProfileRow).id,
    name: (profile.data as ProfileRow).name,
    sellerType: (profile.data as ProfileRow).seller_type,
    city: (profile.data as ProfileRow).city,
    province: (profile.data as ProfileRow).province,
    whatsapp: (profile.data as ProfileRow).whatsapp,
    verified: (profile.data as ProfileRow).verified,
    activeListings: rows.length,
    bestPhotoCount: rows.reduce((max, row) => Math.max(max, row.listing_images?.length ?? 0), 0),
  }
}

export interface ProfileUpdate {
  name: string
  whatsapp: string
  city: string
  province: string
  sellerType: Seller['type']
}

export async function updateProfile(userId: string, input: ProfileUpdate): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('profiles')
    .update({
      name: input.name,
      whatsapp: input.whatsapp,
      city: input.city,
      province: input.province,
      seller_type: input.sellerType,
    })
    .eq('id', userId)

  if (error) throw error
}

/* ---------------------------------------------------------------------------
   Nivel del vendedor
--------------------------------------------------------------------------- */

interface StatsRow {
  user_id: string
  name: string
  whatsapp: string | null
  city: string | null
  active_listings: number
  best_photos: number
  garage_cars: number
}

export interface SellerLevel {
  level: number
  title: string
}

/**
 * Nivel de varios vendedores de una sola consulta.
 *
 * La vista `profile_stats` devuelve números crudos y el nivel se calcula acá
 * con `computeLevel`, que es la única fuente de las reglas. Sin esto habría
 * que pedir los datos de cada vendedor por separado al pintar una grilla.
 */
export async function getSellerLevels(userIds: string[]): Promise<Map<string, SellerLevel>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const client = requireSupabase()
  const { data, error } = await client.from('profile_stats').select('*').in('user_id', unique)
  if (error) throw error

  return new Map(
    (data as StatsRow[]).map((row) => {
      const state = computeLevel({
        profile: { name: row.name, whatsapp: row.whatsapp, city: row.city },
        activeListings: row.active_listings,
        bestPhotoCount: row.best_photos,
        garageCars: row.garage_cars,
      })
      return [row.user_id, { level: state.level, title: state.title }]
    }),
  )
}

/** Los números crudos de un perfil, para la pantalla propia. */
export async function getProfileStats(userId: string): Promise<{
  activeListings: number
  bestPhotoCount: number
  garageCars: number
}> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profile_stats')
    .select('active_listings, best_photos, garage_cars')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  const row = data as Pick<StatsRow, 'active_listings' | 'best_photos' | 'garage_cars'> | null

  return {
    activeListings: row?.active_listings ?? 0,
    bestPhotoCount: row?.best_photos ?? 0,
    garageCars: row?.garage_cars ?? 0,
  }
}
