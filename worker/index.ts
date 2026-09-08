/// <reference types="@cloudflare/workers-types" />

import { SUPABASE_PUBLIC } from '../src/config/supabase-public'

/**
 * Previews de los avisos al compartir el link.
 *
 * El sitio es una SPA: el HTML que sirve el servidor es siempre el mismo y los
 * datos del auto los pone React una vez que arrancó. WhatsApp, Telegram,
 * Facebook y compañía no ejecutan JavaScript — leen el HTML crudo y se van. El
 * resultado era que mandar un auto por WhatsApp mostraba el preview genérico de
 * Autana, sin foto, sin precio y sin modelo. Para un marketplace argentino,
 * donde el link viaja por WhatsApp, eso es perder la mitad de la venta antes de
 * que alguien haga clic.
 *
 * Este Worker se para adelante de los archivos estáticos y, sólo en las fichas
 * de vehículo, reescribe las etiquetas del `<head>` con los datos reales antes
 * de mandar el HTML. Todo lo demás pasa de largo.
 *
 * Regla de oro: si algo acá falla, se sirve la página tal cual. Un preview es
 * un lujo; la página tiene que cargar siempre.
 */

interface Env {
  ASSETS: Fetcher
}

/**
 * El slug se interpola en un filtro de PostgREST, así que se acota antes de
 * usarlo. Lo que no entre en este patrón no es un slug nuestro: los generamos
 * con letras, números y guiones.
 */
const LISTING_URL = /^\/cars\/([A-Za-z0-9-]{1,120})\/?$/

interface ListingRow {
  slug: string
  make: string
  model: string
  trim: string | null
  year: number
  price: number
  currency: string
  mileage: number
  description: string
  city: string
  province: string
  listing_images: { path: string; position: number }[] | null
}

const COLUMNS =
  'slug,make,model,trim,year,price,currency,mileage,description,city,province,listing_images(path,position)'

async function fetchListing(slug: string): Promise<ListingRow | null> {
  const params = new URLSearchParams({
    select: COLUMNS,
    slug: `eq.${slug}`,
    /* Sólo los activos: un aviso pausado o vendido no se ve en el sitio, así
       que tampoco tiene que verse en el preview. */
    status: 'eq.active',
    limit: '1',
  })

  const response = await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/listings?${params}`, {
    headers: {
      apikey: SUPABASE_PUBLIC.anonKey,
      Authorization: `Bearer ${SUPABASE_PUBLIC.anonKey}`,
    },
    /* Un minuto de caché en el borde. Alcanza para que una nota compartida en
       un grupo no pegue cien veces contra la base, y es lo bastante corto como
       para que un cambio de precio se vea casi enseguida. */
    cf: { cacheTtl: 60, cacheEverything: true },
  })

  if (!response.ok) return null
  const rows = (await response.json()) as ListingRow[]
  return rows[0] ?? null
}

function money(price: number, currency: string): string {
  return `${currency} ${price.toLocaleString('es-AR')}`
}

function buildTitle(row: ListingRow): string {
  const name = [row.make, row.model, row.trim].filter(Boolean).join(' ')
  return `${name} ${row.year} — ${money(row.price, row.currency)} | Autana`
}

function buildDescription(row: ListingRow): string {
  const head = `${row.year} · ${row.mileage.toLocaleString('es-AR')} km · ${row.city}, ${row.province}`
  const text = row.description.trim().replace(/\s+/g, ' ')
  /* Los scrapers cortan alrededor de los 160-200 caracteres. Se corta acá para
     elegir nosotros dónde, en vez de que quede una palabra por la mitad. */
  const room = 200 - head.length - 3
  if (!text) return head
  return text.length > room ? `${head}. ${text.slice(0, room).trimEnd()}…` : `${head}. ${text}`
}

function coverImage(row: ListingRow): string | null {
  const images = (row.listing_images ?? []).slice().sort((a, b) => a.position - b.position)
  const first = images[0]
  if (!first) return null
  return `${SUPABASE_PUBLIC.url}/storage/v1/object/public/listing-photos/${first.path}`
}

/** Escapa para meter texto dentro de un atributo HTML. */
function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* Los handlers de HTMLRewriter son cualquier objeto con `element`. Van como
   funciones y no como clases porque no tienen estado propio: son una sola
   operacion sobre el elemento que matchea. */

/* Los metodos de `Element` devuelven el propio elemento para encadenar, y el
   handler tiene que devolver void: de ahi el cuerpo con llaves. */

/** Reemplaza el contenido de texto de un elemento, como el `<title>`. */
function setText(value: string): HTMLRewriterElementContentHandlers {
  return {
    element(element) {
      element.setInnerContent(value)
    },
  }
}

/** Reemplaza el atributo `content` de una etiqueta `<meta>` que ya existe. */
function setContent(value: string): HTMLRewriterElementContentHandlers {
  return {
    element(element) {
      element.setAttribute('content', value)
    },
  }
}

/** Agrega al `<head>` las etiquetas que el HTML estatico no trae. */
function appendToHead(html: string): HTMLRewriterElementContentHandlers {
  return {
    element(element) {
      element.append(html, { html: true })
    },
  }
}

async function renderListing(request: Request, env: Env, slug: string): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request)

  /* Si el fallback de SPA no devolvió HTML no hay nada que reescribir. */
  const type = assetResponse.headers.get('content-type') ?? ''
  if (!type.includes('text/html')) return assetResponse

  const row = await fetchListing(slug)
  /* Aviso inexistente, pausado o vendido: que la SPA muestre lo que
     corresponda con las etiquetas genéricas. */
  if (!row) return assetResponse

  const title = buildTitle(row)
  const description = buildDescription(row)
  const image = coverImage(row)
  const url = new URL(request.url)
  const canonical = `${url.origin}/cars/${row.slug}`

  const extra = [
    `<meta property="og:url" content="${attr(canonical)}">`,
    `<meta property="og:site_name" content="Autana">`,
    `<meta property="og:locale" content="es_AR">`,
    `<link rel="canonical" href="${attr(canonical)}">`,
    image ? `<meta property="og:image" content="${attr(image)}">` : '',
    image ? `<meta property="og:image:alt" content="${attr(title)}">` : '',
    /* Con imagen conviene la tarjeta grande; sin imagen, la chica, o algunos
       clientes muestran un recuadro vacío. Twitter cae solo en las og:* para
       titulo, descripcion e imagen, así que no hace falta repetirlas. */
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
  ]
    .filter(Boolean)
    .join('')

  return new HTMLRewriter()
    .on('title', setText(title))
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('head', appendToHead(extra))
    .transform(assetResponse)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const match = url.pathname.match(LISTING_URL)

    /* Sólo las fichas de vehículo, y sólo lecturas: el resto del sitio no
       necesita que el servidor toque nada. */
    if (!match || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await renderListing(request, env, match[1]!)
    } catch (cause) {
      console.error('preview del aviso', cause)
      /* La página vale más que el preview. */
      return env.ASSETS.fetch(request)
    }
  },
} satisfies ExportedHandler<Env>
