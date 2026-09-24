/**
 * Chequeo de humo: mira el sitio publicado y avisa si algo se rompió.
 *
 *   npm run humo                 contra auteando.com
 *   npm run humo -- http://localhost:8788   contra el Worker local
 *
 * Para correr después de cada deploy. Son los diez minutos de revisión manual
 * que uno nunca hace: que las pantallas contesten, que una dirección inventada
 * dé 404, que los avisos sigan llevando sus datos para Google, que el sitemap
 * y el robots sigan en pie, que las láminas de compartir existan y que la base
 * conteste.
 *
 * No usa navegador a propósito: sólo `fetch`. Así no le suma dependencias al
 * repo y corre en dos segundos. Lo que no puede ver ---que la pantalla se vea
 * bien, que el JavaScript no explote--- no lo cubre esto.
 *
 * Sale con código 1 si algo falla, para poder encadenarlo con el deploy.
 */

const BASE = (process.argv[2] ?? 'https://auteando.com').replace(/\/$/, '')
const esperado = []
let fallas = 0

const verde = (t) => `\x1b[32m${t}\x1b[0m`
const rojo = (t) => `\x1b[31m${t}\x1b[0m`

function anotar(ok, titulo, detalle = '') {
  esperado.push({ ok, titulo, detalle })
  if (!ok) fallas += 1
  console.log(`${ok ? verde('✓') : rojo('✗')} ${titulo}${detalle ? ` — ${detalle}` : ''}`)
}

/** `fetch` que nunca tira: un error de red es una falla más, no un choque. */
async function pedir(ruta, init = {}) {
  try {
    const res = await fetch(BASE + ruta, { redirect: 'manual', ...init })
    const texto = res.headers.get('content-type')?.includes('image') ? '' : await res.text()
    return { status: res.status, texto, headers: res.headers }
  } catch (cause) {
    return { status: 0, texto: '', headers: new Headers(), error: String(cause) }
  }
}

console.log(`\nChequeo de humo sobre ${BASE}\n`)

/* --- Las pantallas contestan ------------------------------------------- */
for (const ruta of ['/', '/explorar', '/autos', '/garage', '/blog', '/niveles', '/ayuda', '/agencias']) {
  const { status } = await pedir(ruta)
  anotar(status === 200, `${ruta} contesta`, status === 200 ? '' : `dio ${status}`)
}

/* --- Lo que no existe, no existe --------------------------------------- */
for (const ruta of ['/esta-ruta-no-existe', '/wp-admin']) {
  const { status } = await pedir(ruta)
  anotar(status === 404, `${ruta} da 404`, status === 404 ? '' : `dio ${status}`)
}

/* --- Un aviso: el que esté primero en el sitemap ------------------------ */
const mapa = await pedir('/sitemap.xml')
anotar(mapa.status === 200 && mapa.texto.includes('<urlset'), 'el sitemap existe')

const urls = [...mapa.texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
anotar(urls.length >= 10, 'el sitemap tiene todas las pantallas', `${urls.length} direcciones`)

const unAviso = urls.find((u) => u.includes('/autos/'))
if (unAviso) {
  const ruta = new URL(unAviso).pathname
  const { status, texto } = await pedir(ruta)
  anotar(status === 200, `un aviso (${ruta}) contesta`)
  anotar(texto.includes('"@type":"Car"'), 'el aviso lleva sus datos para Google')
  anotar(texto.includes('BreadcrumbList'), 'el aviso lleva su camino de migas')
  anotar(
    texto.includes(`<link rel="canonical" href="${BASE}${ruta}">`),
    'el aviso declara su canonical',
  )
  anotar(texto.includes('property="og:image"'), 'el aviso tiene imagen para compartir')
} else {
  anotar(false, 'hay al menos un aviso publicado', 'el sitemap no trae ninguno')
}

/* --- Una nota del blog -------------------------------------------------- */
const unaNota = urls.find((u) => u.includes('/blog/'))
if (unaNota) {
  const { texto } = await pedir(new URL(unaNota).pathname)
  anotar(texto.includes('BlogPosting'), 'la nota del blog va como artículo')
}

/* --- La portada --------------------------------------------------------- */
const portada = await pedir('/')
anotar(portada.texto.includes('"@type":"Organization"'), 'la portada dice quién publica el sitio')
anotar(!portada.texto.includes('fonts.googleapis'), 'las tipografías son propias')

/* --- El robots ---------------------------------------------------------- */
const robots = await pedir('/robots.txt')
anotar(robots.status === 200 && robots.texto.includes('Sitemap:'), 'el robots apunta al sitemap')
anotar(robots.texto.includes('Disallow: /ajustes'), 'el robots esconde lo privado')

/* --- Los archivos que se comparten y se ven ----------------------------- */
for (const archivo of [
  '/og-home.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/fonts/archivo-latin-var.woff2',
]) {
  const { status } = await pedir(archivo)
  anotar(status === 200, `${archivo} está`, status === 200 ? '' : `dio ${status}`)
}

/* --- La base contesta --------------------------------------------------- */
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (url && key) {
  try {
    const res = await fetch(`${url}/rest/v1/listings?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    anotar(res.ok, 'la base contesta', res.ok ? '' : `dio ${res.status}`)
  } catch (cause) {
    anotar(false, 'la base contesta', String(cause))
  }
} else {
  console.log('  (sin VITE_SUPABASE_URL en el entorno: no se prueba la base)')
}

/* --- Resumen ------------------------------------------------------------ */
console.log(
  `\n${fallas === 0 ? verde('todo en orden') : rojo(`${fallas} de ${esperado.length} fallaron`)}\n`,
)
process.exit(fallas === 0 ? 0 : 1)
