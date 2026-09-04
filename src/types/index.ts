/**
 * Modelo de dominio de Autana.
 *
 * Estos tipos son el contrato con el backend. Cuando exista el servidor en Go,
 * cada interface de acá tiene su struct del otro lado y lo unico que cambia es
 * el interior de `src/lib/api.ts`.
 */

export type UserRole = 'buyer' | 'seller' | 'admin'
export type SellerType = 'dealer' | 'private'
export type VehicleCondition = 'new' | 'used' | 'certified'
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'gnc'
export type Transmission = 'manual' | 'automatic' | 'cvt'
export type Drivetrain = 'fwd' | 'rwd' | 'awd' | '4x4'
export type BodyType = 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'coupe' | 'van'
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: UserRole
  createdAt: string
}

export interface Seller {
  id: string
  userId: string
  type: SellerType
  name: string
  location: Location
  /** 0 a 5. `null` cuando todavia no tiene calificaciones. */
  rating: number | null
  reviewCount: number
  listingCount: number
  verified: boolean
  /** En formato local; se normaliza al armar el link de WhatsApp. */
  whatsapp: string | null
}

export interface Location {
  city: string
  province: string
  /** Para el filtro por radio. Ausente si el vendedor no lo cargo. */
  lat?: number
  lng?: number
}

export interface VehicleImage {
  id: string
  url: string
  alt: string
  order: number
}

export interface Vehicle {
  id: string
  /** Identidad publica en la URL: /cars/bmw-320i-sport-line-2022-a4f19c */
  slug: string
  sellerId: string

  make: string
  model: string
  trim: string | null
  year: number

  /** Siempre en la moneda de `currency`, sin decimales. */
  price: number
  currency: 'USD' | 'ARS'
  negotiable: boolean

  mileage: number
  condition: VehicleCondition
  fuelType: FuelType
  transmission: Transmission
  drivetrain: Drivetrain
  bodyType: BodyType
  /** Texto libre: "2.0 T", "1.6 16v". */
  engine: string
  /** Caballos de fuerza. `null` si el vendedor no lo cargo. */
  power: number | null
  doors: number
  color: string

  location: Location
  description: string
  images: VehicleImage[]

  status: ListingStatus
  createdAt: string
  updatedAt: string

  /** Metricas de la publicacion; solo llegan al dueño. */
  viewCount?: number
  favoriteCount?: number

  /* Datos del vendedor que viajan con el aviso para no pedir otra consulta
     por cada card de la grilla. */
  sellerName?: string
  sellerType?: SellerType
  /** Nivel del vendedor, para que el comprador sepa a quien le escribe. */
  sellerLevel?: { level: number; title: string }
}

export interface Favorite {
  id: string
  userId: string
  vehicleId: string
  createdAt: string
}

/**
 * Los filtros se guardan como query string, en el mismo formato que la URL de
 * /cars. Asi hay una sola representacion y compartir una busqueda es copiar
 * el link.
 */
export interface SavedSearch {
  id: string
  userId: string
  name: string
  query: string
  /** Avisar cuando aparezcan autos nuevos que matcheen. */
  notify: boolean
  createdAt: string
}

/**
 * Un auto del garage del usuario. No es una publicacion: es memoria, no venta.
 * El `slot` es cerrado a proposito — la consigna es lo que hace que alguien se
 * siente a completarlo.
 */
export type GarageSlot = 'first' | 'current' | 'dream' | 'missed'

export interface GarageEntry {
  id: string
  userId: string
  slot: GarageSlot
  make: string
  model: string
  year: number | null
  /** URL publica ya resuelta. Vacia = se pinta el placeholder neutro. */
  photoUrl: string
  note: string
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  vehicleId: string
  content: string
  readAt: string | null
  createdAt: string
}

/** Filtros de /cars, ya parseados desde la query string. */
export interface VehicleFilters {
  q?: string
  make?: string
  model?: string
  minYear?: number
  maxYear?: number
  minPrice?: number
  maxPrice?: number
  maxMileage?: number
  fuelType?: FuelType[]
  transmission?: Transmission
  bodyType?: BodyType[]
  province?: string
  sellerType?: SellerType
  condition?: VehicleCondition[]
}

export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
