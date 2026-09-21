/**
 * Los errores, a Sentry.
 *
 * Sin esto un error queda en la consola del navegador de quien lo sufrió, y
 * nadie más se entera: si publicar un aviso falla para todos los que entran
 * desde un celular, lo único que se ve es que nadie publica.
 *
 * No usa el SDK de Sentry a propósito. Pesa unos treinta kilobytes comprimido, en
 * un sitio que se abre desde el celular con datos móviles, para mandar algo
 * que es un POST. Esto le habla directo a su API de ingesta: el mismo sobre
 * (`envelope`) que arma el SDK, con lo mínimo. Lo que se pierde es el rastro
 * con nombres originales ---el código está minificado--- y la agrupación por
 * pila; se agrupa por dónde pasó y qué dijo, que para este tamaño alcanza.
 *
 * Sin `VITE_SENTRY_DSN` no manda nada, y en desarrollo tampoco: sólo el
 * `console.error` de siempre.
 *
 * Qué NO se manda: quién es el usuario. Ni el id ni el mail. La URL sí, porque
 * sin la pantalla el error no se entiende, y en este sitio las URL no llevan
 * datos de nadie.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN

/* Tope por visita. Un error dentro de un bucle de render ---o un efecto que
   reintenta--- manda cientos por minuto, y el plan gratis de Sentry son cinco
   mil por mes: una sola pestaña rota se los come. */
const MAX_POR_VISITA = 10
const enviados = new Set<string>()

/* Errores que no son nuestros: extensiones del navegador que inyectan código
   en todas las páginas, y un aviso de Chrome que es inofensivo pero llega como
   error. */
const RUIDO = [
  /ResizeObserver loop/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /^Script error\.?$/i,
]

interface Destino {
  url: string
  dsn: string
}

/** `https://<clave>@<host>/<proyecto>` → el endpoint de sobres. */
export function destinoDe(dsn: string | undefined): Destino | null {
  if (!dsn) return null
  try {
    const parsed = new URL(dsn)
    const proyecto = parsed.pathname.replace(/^\//, '')
    if (!parsed.username || !proyecto) return null
    return {
      url: `${parsed.protocol}//${parsed.host}/api/${proyecto}/envelope/?sentry_key=${parsed.username}&sentry_version=7`,
      dsn,
    }
  } catch {
    return null
  }
}

function comoError(cause: unknown): { type: string; value: string; stack?: string } {
  if (cause instanceof Error) return { type: cause.name, value: cause.message, stack: cause.stack }
  /* Supabase rechaza con objetos planos `{ message, code }`, no con `Error`. */
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const plano = cause as { message: unknown; code?: unknown }
    return { type: String(plano.code ?? 'Error'), value: String(plano.message) }
  }
  return { type: 'Error', value: String(cause) }
}

/* 32 hexadecimales. `randomUUID` no existe en iOS anterior a 15.4, que todavía
   anda en celulares, y ahí es justo donde más importa enterarse. */
function idDeEvento(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '')
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** El sobre, en el formato de tres líneas que espera Sentry. */
export function armarSobre(dsn: string, where: string, cause: unknown, url: string, ahora = Date.now()) {
  const eventId = idDeEvento()
  const error = comoError(cause)
  const evento = {
    event_id: eventId,
    timestamp: ahora / 1000,
    platform: 'javascript',
    level: 'error',
    environment: 'production',
    request: { url, headers: { 'User-Agent': navigator.userAgent } },
    exception: { values: [{ type: error.type, value: error.value }] },
    tags: { donde: where },
    extra: error.stack ? { stack: error.stack } : undefined,
    /* Un error se agrupa por dónde pasó y qué dijo. */
    fingerprint: [where, error.type, error.value],
  }
  return [
    JSON.stringify({ event_id: eventId, sent_at: new Date(ahora).toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(evento),
  ].join('\n')
}

/**
 * Registra un error: a la consola siempre, y a Sentry en producción.
 *
 * `where` es un nombre corto de qué se estaba haciendo ---"createListing",
 * "guardar favorito"---, el mismo que antes iba primero en el `console.error`.
 */
export function reportError(where: string, cause: unknown, ...extra: unknown[]) {
  console.error(where, cause, ...extra)

  const destino = destinoDe(DSN)
  if (!destino || !import.meta.env.PROD) return
  /* Sin conexión todo falla, y no es un error nuestro. */
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  const { value } = comoError(cause)
  if (RUIDO.some((patron) => patron.test(value))) return

  const clave = `${where}|${value}`
  if (enviados.has(clave) || enviados.size >= MAX_POR_VISITA) return
  enviados.add(clave)

  /* `text/plain` para que el navegador no mande la consulta previa de CORS, y
     `keepalive` para que salga aunque la pestaña se esté cerrando. Si el envío
     falla, se calla: reportar el error de reportar un error no tiene fin. */
  void fetch(destino.url, {
    method: 'POST',
    body: armarSobre(destino.dsn, where, cause, location.href),
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    keepalive: true,
  }).catch(() => {})
}

/**
 * Lo que se escapa de todo: un error fuera de React, o una promesa rechazada
 * que nadie esperó. Los de render los agarra `ErrorBoundary`.
 */
export function installErrorReporting() {
  window.addEventListener('error', (event) => {
    reportError('sin atrapar', event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError('promesa sin atrapar', event.reason)
  })
}
