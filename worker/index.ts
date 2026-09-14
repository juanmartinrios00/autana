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

/**
 * El garage se direcciona por el uuid del usuario, así que se exige la forma
 * exacta de un uuid. Mismo motivo que el slug: se interpola en un filtro.
 */
const GARAGE_URL =
  /^\/g\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/?$/

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

/**
 * El orden de las consignas, para que el preview cuente la historia en el
 * mismo orden que la pantalla: el primero, el de hoy, el soñado, el extrañado.
 *
 * Está duplicado de `src/lib/garage.ts` a propósito. Importarlo de ahí
 * arrastraría el cliente de Supabase y la compresión de imágenes a un Worker
 * que sólo necesita cuatro strings. Y si algún día se desincronizan, lo peor
 * que pasa es que el preview liste los autos en otro orden — no es el caso de
 * `search-query`, donde interpretar distinto cambia lo que se muestra.
 */
const SLOT_ORDER = ['first', 'current', 'dream', 'missed']

interface GarageEntryRow {
  slot: string
  make: string
  model: string
  year: number | null
  photo_path: string | null
}

interface GarageRow {
  name: string
  discoverable: boolean
  garage_entries: GarageEntryRow[] | null
}

/**
 * El garage de alguien, con su nombre.
 *
 * Va en una sola consulta con el embed de PostgREST porque son dos pedidos al
 * pedo si no: el nombre vive en `profiles` y los autos cuelgan de ahí por la
 * clave foránea. Las columnas que se piden son las que la migración 008 dejó
 * legibles; el WhatsApp no está entre ellas y acá no hace falta.
 */
async function fetchGarage(id: string): Promise<GarageRow | null> {
  const params = new URLSearchParams({
    select: 'name,discoverable,garage_entries(slot,make,model,year,photo_path)',
    id: `eq.${id}`,
    limit: '1',
  })

  const response = await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/profiles?${params}`, {
    headers: {
      apikey: SUPABASE_PUBLIC.anonKey,
      Authorization: `Bearer ${SUPABASE_PUBLIC.anonKey}`,
    },
    cf: { cacheTtl: 60, cacheEverything: true },
  })

  if (!response.ok) return null
  const rows = (await response.json()) as GarageRow[]
  return rows[0] ?? null
}

/** Los autos del garage en el orden de las consignas. */
export function orderedEntries(row: GarageRow): GarageEntryRow[] {
  return (row.garage_entries ?? [])
    .slice()
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
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

/**
 * El texto del preview del garage.
 *
 * Lo que se ve en WhatsApp es esto, así que dice los autos y no una promesa:
 * "4 autos" no le interesa a nadie, "Ford Escort 1998, VW Gol 2012" sí — es lo
 * que hace que alguien del grupo abra el link.
 *
 * Sin adjetivos sobre la persona: el nombre sale de lo que cada uno cargó y no
 * sabemos nada más, así que nada de concordancias inventadas.
 */
export function buildGarageDescription(name: string, entries: GarageEntryRow[]): string {
  if (!entries.length) {
    return `${name} todavía no cargó ningún auto en su garage.`
  }

  const cars = entries.map((entry) =>
    [entry.make, entry.model, entry.year].filter(Boolean).join(' '),
  )

  const head =
    entries.length === 1
      ? `Un auto en el garage de ${name}`
      : `${entries.length} autos en el garage de ${name}`

  /* Mismo tope que en los avisos: se corta acá para elegir nosotros dónde. */
  let text = `${head}: `
  const room = 200 - text.length
  const shown: string[] = []
  let used = 0
  for (const car of cars) {
    const cost = used === 0 ? car.length : car.length + 2
    if (used + cost > room) break
    shown.push(car)
    used += cost
  }

  if (!shown.length) return head + '.'
  text += shown.join(', ')
  return shown.length === cars.length ? `${text}.` : `${text}…`
}

/** La primera foto que haya, en el orden de las consignas. */
export function garageImage(entries: GarageEntryRow[]): string | null {
  const withPhoto = entries.find((entry) => entry.photo_path)
  if (!withPhoto?.photo_path) return null
  return `${SUPABASE_PUBLIC.url}/storage/v1/object/public/garage-photos/${withPhoto.photo_path}`
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

/* ---------------------------------------------------------------------------
   robots.txt y sitemap.xml

   Van generados acá y no como archivos en `public/` por una razon concreta:
   con `not_found_handling: single-page-application`, cualquier ruta que no
   exista devuelve el index.html. Un `/robots.txt` que responde HTML es peor
   que no tenerlo. Ademas el sitemap tiene que salir de la base —los avisos
   cambian todos los dias— y la URL del sitemap dentro de robots depende del
   dominio, que puede dejar de ser el de workers.dev.
--------------------------------------------------------------------------- */

function robots(origin: string): Response {
  /* Se bloquea lo que es de cada usuario o parte de un flujo: no aporta nada
     en un buscador y gasta presupuesto de rastreo. El garage publico (`/g/`)
     si se indexa, que para eso se comparte — salvo el de quien se saco del
     buscador, que el worker marca `noindex` en la propia pagina.

     `/gente` se bloquea aunque sea publica: es un formulario de busqueda, y lo
     unico que Google indexaria son resultados para nombres sueltos. */
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /login',
    'Disallow: /sell',
    'Disallow: /profile',
    'Disallow: /my-listings',
    'Disallow: /favorites',
    'Disallow: /gente',
    'Disallow: /siguiendo',
    'Disallow: /garage/mio',
    'Disallow: /novedades',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface SitemapRow {
  slug: string
  updated_at: string
}

interface GarageSitemapRow {
  user_id: string
  updated_at: string
}

/** Una tanda del sitemap, o lista vacia si la base no contesta. */
async function sitemapRows<T>(path: string, params: URLSearchParams): Promise<T[]> {
  const response = await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/${path}?${params}`, {
    headers: {
      apikey: SUPABASE_PUBLIC.anonKey,
      Authorization: `Bearer ${SUPABASE_PUBLIC.anonKey}`,
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  })

  if (!response.ok) return []
  return (await response.json()) as T[]
}

async function sitemap(origin: string): Promise<Response> {
  /* Un sitemap admite 50.000 URLs. Con estos topes estamos lejos; el dia que
     se acerque hay que partirlo en un indice de sitemaps. */
  const [listings, garages] = await Promise.all([
    sitemapRows<SitemapRow>(
      'listings',
      new URLSearchParams({
        select: 'slug,updated_at',
        status: 'eq.active',
        order: 'updated_at.desc',
        limit: '5000',
      }),
    ),
    /* La vista `garage_sitemap` ya filtra: solo los que se dejan encontrar y
       ademas tienen algun auto cargado. Un garage vacio es una pagina sin
       contenido — no le sirve a quien la abre desde Google, y gastaria
       presupuesto de rastreo en nada. */
    sitemapRows<GarageSitemapRow>(
      'garage_sitemap',
      new URLSearchParams({
        select: 'user_id,updated_at',
        order: 'updated_at.desc',
        limit: '5000',
      }),
    ),
  ])

  /* Las fijas van siempre, aunque la base no conteste: mas vale un sitemap
     con la home que un 500 que Google reintenta y termina penalizando. */
  const entries: { loc: string; lastmod?: string }[] = [
    { loc: `${origin}/` },
    { loc: `${origin}/cars` },
    { loc: `${origin}/garage` },
  ]

  for (const row of listings) {
    entries.push({
      loc: `${origin}/cars/${row.slug}`,
      lastmod: row.updated_at.slice(0, 10),
    })
  }

  for (const row of garages) {
    entries.push({
      loc: `${origin}/g/${row.user_id}`,
      lastmod: row.updated_at.slice(0, 10),
    })
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) =>
      entry.lastmod
        ? `<url><loc>${xmlEscape(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod></url>`
        : `<url><loc>${xmlEscape(entry.loc)}</loc></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}

interface Preview {
  title: string
  description: string
  image: string | null
  canonical: string
  /** Que los buscadores no lo indexen. El preview al compartir va igual. */
  noindex?: boolean
}

/**
 * Escribe un preview sobre el HTML que devolvió la SPA.
 *
 * Es lo único que comparten el aviso y el garage: las dos pantallas arman
 * textos distintos, pero las etiquetas que hay que tocar son las mismas.
 */
function renderPreview(assetResponse: Response, preview: Preview): Response {
  const { title, description, image, canonical, noindex } = preview

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
    /* `noindex` saca la pagina del buscador; `nofollow` no va, porque los
       links de adentro son del propio sitio y no hay nada que no rastrear.
       El preview al compartir se arma igual: apagar Google no es apagar
       WhatsApp, y el link sigue siendo para mandarlo. */
    noindex ? `<meta name="robots" content="noindex">` : '',
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

/** El HTML de la SPA, o `null` si lo que volvió no es HTML y no hay qué tocar. */
async function htmlFor(request: Request, env: Env): Promise<Response | null> {
  const assetResponse = await env.ASSETS.fetch(request)
  const type = assetResponse.headers.get('content-type') ?? ''
  return type.includes('text/html') ? assetResponse : null
}

async function renderListing(request: Request, env: Env, slug: string): Promise<Response> {
  const assetResponse = await htmlFor(request, env)
  if (!assetResponse) return env.ASSETS.fetch(request)

  const row = await fetchListing(slug)
  /* Aviso inexistente, pausado o vendido: que la SPA muestre lo que
     corresponda con las etiquetas genéricas. */
  if (!row) return assetResponse

  const title = buildTitle(row)
  const url = new URL(request.url)

  return renderPreview(assetResponse, {
    title,
    description: buildDescription(row),
    image: coverImage(row),
    canonical: `${url.origin}/cars/${row.slug}`,
  })
}

/**
 * El preview del garage.
 *
 * La pantalla existe para mandarse por WhatsApp —lo dice la migración 002 y lo
 * dice el botón de copiar link—, y hasta acá ese link mostraba el preview
 * genérico de Autana: ni el nombre ni los autos. Era el mismo problema que
 * este Worker ya resolvía para los avisos, en la única pantalla cuyo propósito
 * es compartirse.
 */
async function renderGarage(request: Request, env: Env, id: string): Promise<Response> {
  const assetResponse = await htmlFor(request, env)
  if (!assetResponse) return env.ASSETS.fetch(request)

  const row = await fetchGarage(id)
  /* Usuario que no existe, o sin nombre cargado: que la SPA muestre lo que
     corresponda con las etiquetas genéricas. */
  if (!row) return assetResponse

  const name = row.name.trim()
  if (!name) return assetResponse

  const entries = orderedEntries(row)
  const url = new URL(request.url)

  return renderPreview(assetResponse, {
    title: `El garage de ${name} | Autana`,
    description: buildGarageDescription(name, entries),
    /* La foto que subió el dueño. Si no hay ninguna, el garage se ve igual en
       el sitio —las escenas dibujadas hacen de retrato— pero el preview se
       queda sin imagen: un SVG no sirve como `og:image`, WhatsApp no lo
       renderiza. Generar una lámina es otro trabajo. */
    image: garageImage(entries),
    canonical: `${url.origin}/g/${id}`,
    /* Quien se sacó del buscador se saca también de Google. Es lo que hace que
       el interruptor de Ajustes signifique algo afuera del sitio: sin esto
       seguiría apareciendo en una búsqueda por su nombre, que es exactamente
       lo que pidió que no pasara. */
    noindex: !row.discoverable,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/robots.txt') return robots(url.origin)
    if (url.pathname === '/sitemap.xml') return sitemap(url.origin)

    /* Sólo lecturas: el resto del sitio no necesita que el servidor toque nada. */
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return env.ASSETS.fetch(request)
    }

    const listing = url.pathname.match(LISTING_URL)
    if (listing) {
      try {
        return await renderListing(request, env, listing[1]!)
      } catch (cause) {
        console.error('preview del aviso', cause)
        /* La página vale más que el preview. */
        return env.ASSETS.fetch(request)
      }
    }

    const garage = url.pathname.match(GARAGE_URL)
    if (garage) {
      try {
        return await renderGarage(request, env, garage[1]!)
      } catch (cause) {
        console.error('preview del garage', cause)
        return env.ASSETS.fetch(request)
      }
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
