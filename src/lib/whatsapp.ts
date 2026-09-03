/**
 * Contacto por WhatsApp.
 *
 * Para la primera versión el contacto no es mensajería interna: acá los autos
 * se venden por WhatsApp, así que abrimos ese chat con el mensaje ya escrito.
 * Mensajería propia cuando haya volumen y valga la pena quedarse con la
 * conversación adentro.
 */

/** Normaliza a formato internacional: solo dígitos, con 54 adelante. */
export function toE164(raw: string, countryCode = '54'): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.startsWith(countryCode)) return digits
  /* Los celulares argentinos se marcan con el 9 después del país. */
  return `${countryCode}9${digits.replace(/^0/, '')}`
}

export function whatsappLink(phone: string, message: string): string | null {
  const number = toE164(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function listingMessage(title: string, url: string): string {
  return `Hola, te escribo por el ${title} que publicaste en Autana. ¿Sigue disponible?\n\n${url}`
}
