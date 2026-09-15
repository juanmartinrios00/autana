/**
 * Instagram y mail de contacto: cómo se escriben, cómo se guardan, cómo se
 * muestran.
 *
 * La regla de forma vive también en la base (migración 014), pero acá se
 * normaliza antes de mandar: la gente pega el link entero de su perfil, pone
 * la arroba, deja un espacio al final. Rechazar eso con "formato inválido"
 * sería pedirle que haga a mano lo que se puede hacer solo.
 */

import { BRAND } from '../config/brand'

/** Lo que Instagram acepta en un nombre de usuario. */
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/

/**
 * El usuario de Instagram a guardar, a partir de lo que alguien pegó.
 *
 * Devuelve `null` si quedó vacío —el campo es opcional— y `undefined` si hay
 * algo pero no es un usuario válido, para que el formulario pueda distinguir
 * "no puso nada" de "puso algo mal".
 */
export function normalizeInstagram(raw: string): string | null | undefined {
  let value = raw.trim()
  if (!value) return null

  /* El link del perfil, con o sin protocolo, con o sin www, con barra al final
     o con parámetros de la app pegados atrás. */
  const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i)
  if (fromUrl) value = fromUrl[1]!

  value = value.replace(/^@+/, '')

  return INSTAGRAM_HANDLE.test(value) ? value : undefined
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${encodeURIComponent(handle)}`
}

/**
 * Si un mail de contacto tiene forma de mail. No es una validación completa
 * —eso no existe con una expresión—: es la misma que aplica la base, para que
 * el formulario no deje pasar algo que después la base rechaza.
 */
export function isContactEmail(value: string): boolean {
  const email = value.trim()
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

/** `mailto:` con el asunto ya puesto, igual que el mensaje de WhatsApp. */
export function contactMailto(email: string, title: string): string {
  const subject = `Consulta por el ${title} en ${BRAND}`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}

/** "A 12 personas les interesa", o nada si todavía no hay nadie. */
export function interestLabel(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? 'A 1 persona le interesa' : `A ${count} personas les interesa`
}
