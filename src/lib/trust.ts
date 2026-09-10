/**
 * La señal de confianza que ve el comprador.
 *
 * Es a propósito aburrida: hechos, no un puntaje.
 *
 * Antes acá iba el nivel del vendedor, que se gana en parte cargando autos en
 * el garage — el primer auto, el que más se extraña. Eso es nostalgia, no una
 * medida de con quién es seguro encontrarse a entregar plata. Pero el
 * comprador no lee esa diferencia: ve un sello lindo al lado del precio y
 * asume que dice algo del vendedor. El nivel volvió a ser un juego y vive en
 * el perfil; acá quedan dos hechos que se pueden verificar.
 *
 * Tampoco hay número. Un "8,4 de confianza" tiene el mismo problema que el
 * nivel: promete una precisión que los datos no tienen, y el que lo lee no
 * puede saber de dónde salió. Dos hechos que el comprador interpreta solo son
 * más útiles que un puntaje que tiene que creer.
 */

export interface TrustInput {
  verified: boolean
  /** ISO. Cuándo se creó la cuenta. */
  memberSince: string
}

export interface TrustSignal {
  /** Lo puso una persona a mano. Es el único sello fuerte. */
  verified: boolean
  /** Meses cumplidos desde que se registró. */
  monthsOn: number
  /** Para la ficha: "en Autana desde marzo de 2026". */
  since: string
  /** Para la card, donde no entra más: "Desde mar 2026" o "Cuenta nueva". */
  sinceShort: string
  /**
   * Cuenta de menos de un mes. No es una acusación: es el dato que conviene
   * que se vea cuando alguien recién llegado publica un auto caro.
   */
  isNew: boolean
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function computeTrust({ verified, memberSince }: TrustInput, now = new Date()): TrustSignal {
  const start = new Date(memberSince)

  /* Meses de calendario cumplidos, no días divididos por treinta: alguien que
     se registró el 31 de enero es "de enero" el 1 de marzo, y contar en días
     lo dejaría en un mes y monedas. */
  let monthsOn =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) monthsOn -= 1
  monthsOn = Math.max(0, monthsOn)

  const month = MONTHS[start.getMonth()] ?? ''
  const year = start.getFullYear()
  const isNew = monthsOn < 1

  return {
    verified,
    monthsOn,
    since: `en Autana desde ${month} de ${year}`,
    sinceShort: isNew ? 'Cuenta nueva' : `Desde ${month.slice(0, 3)} ${year}`,
    isNew,
  }
}
