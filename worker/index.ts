/// <reference types="@cloudflare/workers-types" />

import { BRAND, pageTitle } from '../src/config/brand'
import { findPost, postsByDate } from '../src/content/blog/posts'
import { SUPABASE_PUBLIC } from '../src/config/supabase-public'

/**
 * Previews de los avisos al compartir el link.
 *
 * El sitio es una SPA: el HTML que sirve el servidor es siempre el mismo y los
 * datos del auto los pone React una vez que arrancó. WhatsApp, Telegram,
 * Facebook y compañía no ejecutan JavaScript — leen el HTML crudo y se van. El
 * resultado era que mandar un auto por WhatsApp mostraba el preview genérico de
 * auteando, sin foto, sin precio y sin modelo. Para un marketplace argentino,
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
export const LISTING_URL = /^\/autos\/([A-Za-z0-9-]{1,120})\/?$/
export const BLOG_URL = /^\/blog\/([a-z0-9-]{1,120})\/?$/

/**
 * El garage se direcciona por el uuid del usuario, así que se exige la forma
 * exacta de un uuid. Mismo motivo que el slug: se interpola en un filtro.
 */
export const GARAGE_URL =
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
  /** Fotos y notas ocultas por moderación (018). */
  content_hidden?: boolean
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
    select: 'name,discoverable,content_hidden,garage_entries(slot,make,model,year,photo_path)',
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

export function buildTitle(row: ListingRow): string {
  const name = [row.make, row.model, row.trim].filter(Boolean).join(' ')
  return pageTitle(`${name} ${row.year} — ${money(row.price, row.currency)}`)
}

export function buildDescription(row: ListingRow): string {
  const head = `${row.year} · ${row.mileage.toLocaleString('es-AR')} km · ${row.city}, ${row.province}`
  const text = row.description.trim().replace(/\s+/g, ' ')
  /* Los scrapers cortan alrededor de los 160-200 caracteres. Se corta acá para
     elegir nosotros dónde, en vez de que quede una palabra por la mitad. */
  const room = 200 - head.length - 3

  /* Sin lugar para un fragmento que se entienda, va el encabezado solo.
     La ciudad es texto libre y la columna no tiene tope, así que un valor
     largo deja `room` en negativo — y `slice(0, -40)` no corta los primeros
     cuarenta caracteres, corta los últimos cuarenta y devuelve casi toda la
     descripción, que es exactamente lo contrario de lo que este corte busca. */
  if (!text || room < 20) return head

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

/**
 * La imagen del preview de un garage: la primera foto que haya, o si no hay
 * ninguna, la lámina fija con los dibujos (`public/og-garage.png`, que genera
 * `npm run og:garage`).
 *
 * Sin foto, antes el preview iba sin imagen. Para la mayoría ese es el caso
 * —nadie tiene a mano la foto del auto que vendió en 2011—, así que era el
 * preview que más se veía.
 */
export function garagePreviewImage(entries: GarageEntryRow[], origin: string, hidden = false): string {
  /* Con el contenido oculto por moderación no va ninguna foto de la persona:
     justo el preview de WhatsApp es por donde más lejos viaja una imagen. */
  if (hidden) return `${origin}/og-garage.png`
  return garageImage(entries) ?? `${origin}/og-garage.png`
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
export function attr(value: string): string {
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

/**
 * Lo que no va al buscador: lo que es de cada usuario o parte de un flujo. No
 * aporta nada en un buscador y gasta presupuesto de rastreo.
 *
 * Se exporta junto con `STATIC_PAGES` para que un test pueda cruzarlas. Las dos
 * listas dicen cosas opuestas sobre las mismas URLs, y una pagina que caiga en
 * las dos es una contradiccion que Google resuelve solo y a su criterio: el
 * sitemap la ofrece y el robots la prohibe.
 */
export const DISALLOWED = [
  '/entrar',
  '/vender',
  '/perfil',
  '/mis-avisos',
  '/favoritos',
  '/ajustes',
  '/admin',
  '/comparar',
  '/recuperar',
  '/gente',
  '/siguiendo',
  '/garage/mio',
  '/novedades',
]

/** Las publicas con contenido propio, que van fijas al sitemap. */
export const STATIC_PAGES = [
  '/',
  '/autos',
  '/garage',
  '/blog',
  '/ayuda',
  '/agencias',
  '/niveles',
  '/contacto',
  '/terminos',
  '/privacidad',
]

function robots(origin: string): Response {
  /* El garage publico (`/g/`) si se indexa, que para eso se comparte — salvo el
     de quien se saco del buscador, que el worker marca `noindex` en la propia
     pagina.

     `/gente` se bloquea aunque sea publica: es un formulario de busqueda, y lo
     unico que Google indexaria son resultados para nombres sueltos. `/comparar`
     por lo mismo y peor: la comparacion vive en la query string, asi que es un
     espacio infinito de URLs distintas ---cada combinacion de tres autos--- y
     ninguna dice nada que no diga la ficha de cada uno.

     `/ajustes` y `/admin` entran por el primer criterio y faltaban, al lado de
     `/perfil` y `/mis-avisos` que ya estaban. `/recuperar` es un paso de un flujo
     y ademas se llega con un token en el link. */
  const body = [
    'User-agent: *',
    'Allow: /',
    ...DISALLOWED.map((path) => `Disallow: ${path}`),
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

export function xmlEscape(value: string): string {
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
     con la home que un 500 que Google reintenta y termina penalizando.

     Son todas las publicas que tienen contenido propio y no estan en el
     `Disallow` de robots. Faltaban cuatro, y dos de esas son justo las que le
     sirven al negocio: `/ayuda` es un FAQ escrito ---el tipo de pagina por la
     que alguien llega buscando "como transferir un auto usado"--- y `/agencias`
     es la pagina que le explica el producto a una agencia. Estar en el sitemap
     no garantiza nada, pero no estar es no haberlas ofrecido. */
  const entries: { loc: string; lastmod?: string }[] = STATIC_PAGES.map((path) => ({
    loc: `${origin}${path}`,
  }))

  /* Las notas no salen de la base: viven en el bundle, asi que entran siempre
     —aunque Supabase no conteste— y con su fecha de publicacion. */
  for (const post of postsByDate()) {
    entries.push({ loc: `${origin}/blog/${post.slug}`, lastmod: post.date })
  }

  for (const row of listings) {
    entries.push({
      loc: `${origin}/autos/${row.slug}`,
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
    `<meta property="og:site_name" content="${attr(BRAND)}">`,
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

/** Si lo que devolvió el asset es HTML, o sea si hay algo que reescribir. */
function isHtml(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('text/html')
}

/** El HTML de la SPA, o `null` si lo que volvió no es HTML y no hay qué tocar. */
async function htmlFor(request: Request, env: Env): Promise<Response | null> {
  const assetResponse = await env.ASSETS.fetch(request)
  return isHtml(assetResponse) ? assetResponse : null
}

/**
 * La URL que representa a una pantalla: la del pedido, sin la query.
 *
 * Tirar la query es el punto. `/autos` se alcanza con cualquier combinación de
 * filtros ---y los filtros viven en la URL a propósito, que es lo que hace que
 * una búsqueda se comparta copiando el link--- así que `/autos?make=BMW`,
 * `/autos?make=BMW&minPrice=20000` y `/autos?maxYear=2015` son URLs distintas con
 * el mismo listado abajo. Sin esto Google ve un espacio infinito de páginas
 * casi iguales y reparte entre todas lo que le corresponde a una sola.
 *
 * La barra del final se cae porque `/autos/` y `/autos` sirven lo mismo: el
 * router no distingue, y dos URLs para una pantalla es justo lo que se está
 * arreglando.
 */
export function canonicalFor(url: URL): string {
  const path = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${path || '/'}`
}

/**
 * La lámina fija del sitio: `public/og-home.png`, que genera `npm run og:home`.
 *
 * Es el piso de todo lo que se comparte. Una imagen por pantalla no tendría qué
 * dibujar ---la ayuda y los términos no tienen foto, y la portada cambia de
 * autos todos los días--- y lo que la lámina dice, que acá se compran y se
 * venden autos, no cambia nunca.
 *
 * La usan tres. Las pantallas fijas, que no tienen nada propio. Las notas del
 * blog, que no tienen imagen y nunca la tuvieron, justo siendo lo que uno manda
 * cuando quiere que alguien conozca el sitio. Y las fichas sin fotos, que se
 * pueden publicar: `if (photos.length > 0)` en el alta, asi que subir ninguna
 * es una opcion y esa ficha salia sin nada.
 *
 * Mismo criterio que el garage con `og-garage.png`, que ya lo hacía.
 */
function homeImage(origin: string): string {
  return `${origin}/og-home.png`
}

/**
 * El canonical de las pantallas que no tienen preview propio.
 *
 * Las fichas, los garages y las notas ya lo traen desde `renderPreview`, que
 * además les arma título, descripción e imagen. Las demás ---la portada, el
 * listado, el blog, la ayuda, los términos--- no tienen nada de eso que armar,
 * pero sí necesitan decir cuál es su URL buena.
 *
 * Va en el worker y no en la aplicación por lo mismo de siempre: es lo que se
 * sirve en el HTML crudo. Que la SPA lo actualice al navegar de una pantalla a
 * otra no haría falta, porque ningún buscador navega ---pide cada URL por
 * separado--- y sería la misma regla escrita en dos lugares.
 */
function renderCanonical(assetResponse: Response, url: URL): Response {
  const canonical = canonicalFor(url)
  const image = homeImage(url.origin)

  return new HTMLRewriter()
    .on(
      'head',
      appendToHead(
        `<meta property="og:url" content="${attr(canonical)}">` +
          `<meta property="og:site_name" content="${attr(BRAND)}">` +
          `<meta property="og:image" content="${attr(image)}">` +
          `<meta property="og:image:alt" content="${attr(`Comprá y vendé autos sin comisión | ${BRAND}`)}">` +
          `<meta name="twitter:card" content="summary_large_image">` +
          `<link rel="canonical" href="${attr(canonical)}">`,
      ),
    )
    .transform(assetResponse)
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
    image: coverImage(row) ?? homeImage(url.origin),
    canonical: `${url.origin}/autos/${row.slug}`,
  })
}

/**
 * El preview del garage.
 *
 * La pantalla existe para mandarse por WhatsApp —lo dice la migración 002 y lo
 * dice el botón de copiar link—, y hasta acá ese link mostraba el preview
 * genérico de auteando: ni el nombre ni los autos. Era el mismo problema que
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
    title: pageTitle(`El garage de ${name}`),
    description: buildGarageDescription(name, entries),
    /* La foto que subió el dueño, o la lámina con los dibujos. Tiene que ser
       un PNG y no las escenas en SVG: WhatsApp no renderiza SVG como imagen
       de preview. */
    image: garagePreviewImage(entries, url.origin, Boolean(row.content_hidden)),
    canonical: `${url.origin}/g/${id}`,
    /* Quien se sacó del buscador se saca también de Google. Es lo que hace que
       el interruptor de Ajustes signifique algo afuera del sitio: sin esto
       seguiría apareciendo en una búsqueda por su nombre, que es exactamente
       lo que pidió que no pasara. */
    noindex: !row.discoverable || Boolean(row.content_hidden),
  })
}

/**
 * El preview de una nota del blog.
 *
 * Es el único de los tres que no toca la base: los artículos viven en el
 * bundle, así que el título y el resumen ya están acá y no hay latencia ni un
 * fallo posible del lado de Supabase.
 *
 * Sin imagen, a propósito. La portada de cada nota es un archivo con hash en
 * el nombre que sale del build, y desde el Worker no hay forma de saber cómo
 * quedó llamado sin leer el manifiesto. Una tarjeta chica bien puesta es mejor
 * que una grande apuntando a una imagen que no existe; cuando las portadas
 * estén, se resuelve con el manifiesto de Vite.
 */
function renderPost(assetResponse: Response, request: Request, slug: string): Response {
  const post = findPost(slug)
  if (!post) return assetResponse

  const url = new URL(request.url)

  return renderPreview(assetResponse, {
    title: pageTitle(post.title),
    description: post.summary,
    image: homeImage(url.origin),
    canonical: `${url.origin}/blog/${post.slug}`,
  })
}

/**
 * El dominio definitivo del sitio, o `null` mientras no haya uno.
 *
 * Un Worker contesta en todos los dominios que tenga atados, así que apenas
 * `auteando.com` apunte acá el sitio entero va a existir dos veces: en el
 * dominio propio y en el de `workers.dev`. Para Google eso es el mismo
 * contenido en dos lugares y tiene que elegir cuál indexar; elige mal más o
 * menos la mitad de las veces, y ahí el resultado de búsqueda muestra una
 * dirección que nadie quiere repartir.
 *
 * Además todo lo que arma una URL absoluta sale del host del pedido ---el
 * canonical, el `og:url`, el sitemap y la dirección que está adentro del
 * robots--- así que sin esto cada uno diría el dominio por el que entraron.
 *
 * Prendido el 20/9/2026, recién después de atar `auteando.com` al Worker en
 * Cloudflare y de comprobar que servía el sitio con su certificado. Ese orden
 * es el único que hay: prendido antes de que el dominio resuelva, el sitio se
 * redirige a un lugar que todavía no existe y queda caído para todo el mundo.
 */
export const CANONICAL_HOST: string | null = 'auteando.com'

/**
 * Manda a `auteando.com` a quien haya entrado por el dominio de `workers.dev`.
 *
 * 301 y no 302: es permanente, y es lo que hace que los buscadores muevan lo
 * que ya tenían indexado en vez de guardar los dos. Se conservan el camino y la
 * query, porque un link viejo a una ficha tiene que seguir cayendo en esa ficha.
 *
 * Sólo en `GET` y `HEAD`. Redirigir un `POST` con 301 hace que el navegador lo
 * repita como `GET` y pierda el cuerpo; acá no hay ninguno que importe, pero es
 * una trampa que no cuesta nada esquivar.
 */
export function canonicalRedirect(url: URL, request: Request): Response | null {
  if (!CANONICAL_HOST || url.hostname === CANONICAL_HOST) return null
  if (request.method !== 'GET' && request.method !== 'HEAD') return null

  const destino = new URL(url)
  destino.hostname = CANONICAL_HOST
  destino.protocol = 'https:'
  destino.port = ''
  return Response.redirect(destino.toString(), 301)
}

/**
 * Las rutas de antes, cuando los caminos estaban en ingles.
 *
 * El sitio es para Argentina y las pantallas ya se llamaban mitad y mitad
 * ---`/gente` y `/novedades` en castellano, `/cars` y `/sell` en ingles--- asi
 * que se unificaron. Esto existe para que nada de lo que ya este dando vueltas
 * se caiga: un link mandado por WhatsApp, un favorito del navegador, lo que
 * Google haya alcanzado a indexar.
 *
 * Ninguna de las nuevas empieza con una de las viejas, asi que no hay forma de
 * entrar en un bucle. Hay un test que lo sostiene, porque es la clase de cosa
 * que se rompe agregando una ruta un año despues.
 */
export const RUTAS_VIEJAS: Record<string, string> = {
  '/cars': '/autos',
  '/sell': '/vender',
  '/favorites': '/favoritos',
  '/my-listings': '/mis-avisos',
  '/settings': '/ajustes',
  '/compare': '/comparar',
  '/login': '/entrar',
  '/reset': '/recuperar',
  '/levels': '/niveles',
  '/dealers': '/agencias',
  '/help': '/ayuda',
  '/contact': '/contacto',
  '/terms': '/terminos',
  '/privacy': '/privacidad',
  '/profile': '/perfil',
}

/**
 * Manda una ruta vieja a la nueva, conservando lo que venga despues.
 *
 * 301 y por el mismo motivo que la del dominio: es permanente, y es lo que hace
 * que un buscador mueva lo que tenia en vez de guardar las dos. Quien entre por
 * el dominio viejo *y* una ruta vieja va a dar dos saltos, uno por cada cosa que
 * cambio. Se podrian juntar en uno, pero serian dos reglas escritas adentro de
 * una, y un salto de mas no le cuesta nada a nadie.
 */
export function legacyRedirect(url: URL, request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null

  for (const [viejo, nuevo] of Object.entries(RUTAS_VIEJAS)) {
    if (url.pathname !== viejo && !url.pathname.startsWith(`${viejo}/`)) continue

    /* `/sell/:slug/edit` es la unica vieja con una palabra propia despues del
       slug, asi que es la unica que ademas hay que traducir por dentro. */
    const resto = url.pathname.slice(viejo.length).replace(/\/edit$/, '/editar')

    const destino = new URL(url)
    destino.pathname = nuevo + resto
    return Response.redirect(destino.toString(), 301)
  }

  return null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const canonical = canonicalRedirect(url, request)
    if (canonical) return canonical

    const legacy = legacyRedirect(url, request)
    if (legacy) return legacy

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

    const post = url.pathname.match(BLOG_URL)
    if (post) {
      try {
        const assetResponse = await htmlFor(request, env)
        return assetResponse ? renderPost(assetResponse, request, post[1]!) : env.ASSETS.fetch(request)
      } catch (cause) {
        console.error('preview de la nota', cause)
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

    /* Todo lo demás: el HTML de la SPA con su canonical, y los archivos que no
       son HTML tal cual vienen. */
    const assetResponse = await env.ASSETS.fetch(request)
    return isHtml(assetResponse) ? renderCanonical(assetResponse, url) : assetResponse
  },
} satisfies ExportedHandler<Env>
