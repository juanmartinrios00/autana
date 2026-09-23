/**
 * Contacto por WhatsApp.
 *
 * Para la primera versión el contacto no es mensajería interna: acá los autos
 * se venden por WhatsApp, así que abrimos ese chat con el mensaje ya escrito.
 * Mensajería propia cuando haya volumen y valga la pena quedarse con la
 * conversación adentro.
 */

import { BRAND } from '../config/brand'

/* Un numero argentino tiene siempre diez digitos significativos: la
   caracteristica (2, 3 o 4) mas el abonado, que completa hasta diez. De ahi
   salen los dos largos internacionales: 54 + 9 + 10 para celular y 54 + 10
   para fijo. Todo lo que mide menos que eso arrancando en 54 no es un numero
   internacional, es uno local que casualmente empieza con esos digitos. */
const NATIONAL_DIGITS = 10
const SHORTEST_INTERNATIONAL = 12

/** La unica caracteristica de dos digitos del pais. */
const CABA = '11'

/**
 * Saca el 15 con el que se marca un celular desde una linea del pais.
 *
 * Es el error mas comun del formulario y el mas caro: la gente escribe su
 * numero como lo escribe siempre ---`011 15 4444 5555`, `0341 15 555 5555`---
 * y ese 15 no va cuando se llama desde afuera. Colado adentro, el numero queda
 * de doce digitos y `wa.me` abre un chat con nadie. El vendedor nunca se
 * entera de que el boton de "Me interesa" no le trae a ningun comprador.
 *
 * Con el 15 puesto el numero mide doce, asi que se busca solo en ese largo. La
 * posicion depende de cuanto mida la caracteristica, y ahi hay una ambiguedad
 * real: `3415154...` puede leerse como 341-15-514... o como 3415-15-4... Se
 * prueba de la mas corta a la mas larga, que es el orden en que las
 * caracteristicas son mas frecuentes, y el 11 se acepta solo si el numero
 * empieza con 11, que es la unica de dos digitos que existe.
 */
function dropMobilePrefix(local: string): string {
  if (local.length !== NATIONAL_DIGITS + 2) return local
  for (const areaLength of [2, 3, 4]) {
    if (areaLength === 2 && !local.startsWith(CABA)) continue
    if (local.slice(areaLength, areaLength + 2) === '15') {
      return local.slice(0, areaLength) + local.slice(areaLength + 2)
    }
  }
  return local
}

/**
 * Normaliza a formato internacional: solo digitos, con 54 adelante.
 *
 * Devuelve `null` cuando no se puede armar un numero contactable, y eso apaga
 * el boton de WhatsApp. Es a proposito: un boton que no esta se entiende, y un
 * boton que abre el chat de un desconocido manda al comprador a escribirle a
 * cualquiera y deja al vendedor esperando un mensaje que nunca llega.
 */
export function toE164(raw: string, countryCode = '54'): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null

  /* El + es una declaracion: quien lo escribe esta diciendo "esto ya esta en
     formato internacional". Se le cree, aunque no sea argentino ---hay
     vendedores del otro lado del rio--- siempre que haya digitos suficientes
     para que sea un pais mas un numero. */
  if (raw.trimStart().startsWith('+')) {
    return digits.length >= NATIONAL_DIGITS ? digits : null
  }

  /* Ya viene internacional, sin el +. El largo es lo que lo distingue de un
     numero local que empieza igual: en CABA `5411-2233` es un fijo comun y
     corriente, y devolverlo tal cual armaba un `wa.me/54112233` de ocho
     digitos que no es el telefono de nadie. */
  if (digits.startsWith(countryCode) && digits.length >= SHORTEST_INTERNATIONAL) return digits

  /* El 0 de larga distancia tampoco viaja. */
  const local = dropMobilePrefix(digits.replace(/^0/, ''))

  /* Un local que arranca en 15 es un celular al que le falta la
     caracteristica: no existe ninguna que empiece asi, y sin ella el numero no
     se puede reconstruir ---`15 4444 5555` es un telefono distinto en cada
     provincia. */
  if (local.startsWith('15')) return null
  if (local.length !== NATIONAL_DIGITS) return null

  /* Los celulares argentinos se marcan con el 9 después del país. */
  return `${countryCode}9${local}`
}

export function whatsappLink(phone: string, message: string): string | null {
  const number = toE164(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function listingMessage(title: string, url: string): string {
  return `Hola, te escribo por el ${title} que publicaste en ${BRAND}. ¿Sigue disponible?\n\n${url}`
}

/**
 * El mensaje para pasarle un aviso a otra persona, que no es el mismo que se le
 * escribe a quien vende: acá nadie pregunta si sigue disponible.
 *
 * Con el precio adelante, que es lo primero que se mira cuando alguien te pasa
 * un auto, y el link solo al final, que es lo que WhatsApp convierte en tarjeta
 * con la foto.
 */
export function shareMessage(title: string, price: string, url: string): string {
  return `Mirá este ${title} — ${price}\n\n${url}`
}
