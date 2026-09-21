/**
 * Niveles y logros.
 *
 * El nivel NO se guarda en ningún lado: es una función pura de datos que ya
 * existen. Eso evita el problema clásico de estos sistemas, que es que el
 * contador guardado se desincroniza del mundo real y termina premiando a
 * quien borró una publicación. Si el dato cambia, el nivel cambia solo.
 *
 * Todos los logros son verificables. Ninguno se otorga "por participar".
 *
 * Lo que el nivel NO es: una señal de confianza. Dos de los siete logros son
 * del garage —el primer auto, el que más se extraña—, que es nostalgia y no
 * dice nada sobre con quién es seguro encontrarse a entregar plata. Por eso
 * vive solo en el perfil. Lo que ve el comprador junto al precio son hechos
 * verificables y está en `trust.ts`; no mezclar las dos cosas otra vez.
 */

import { SLOTS } from '../data/garage-slots'
import type { ListingStatus } from '../types'

/**
 * Los estados de un aviso que cuentan como "lo publicaste".
 *
 * Activo, pausado y vendido: salió publicado y sigue en la base. Hasta la 022
 * sólo contaba el activo, y marcar un auto como vendido te sacaba "Primera
 * publicación" y "Publicación completa" de golpe ---o sea que vender, que es
 * para lo que existe el sitio, te bajaba de nivel---. Un borrador no cuenta
 * porque nunca salió, uno bloqueado por moderación tampoco, y uno borrado ya
 * no está: borrar sí baja el nivel, a propósito.
 *
 * La misma lista está en la migración 022, porque la vista `profile_stats`
 * cuenta lo mismo del lado de la base. Un test lee el SQL y las compara.
 */
export const PUBLISHED_STATUSES: readonly ListingStatus[] = ['active', 'paused', 'sold']

/** Las fotos que pide "Publicación completa". Exportado porque las misiones
 *  cuentan cuántas le faltan a cada aviso, y un 8 escrito en dos lugares se
 *  desacuerda el día que alguien lo afloje en uno solo. */
export const RICH_PHOTOS = 8

export type AchievementId =
  | 'profile_complete'
  | 'first_listing'
  | 'rich_listing'
  | 'three_listings'
  | 'first_sale'
  | 'garage_started'
  | 'garage_complete'

export interface Achievement {
  id: AchievementId
  title: string
  /** Qué hay que hacer, en imperativo: es una instrucción, no un premio. */
  hint: string
  done: boolean
}

export interface LevelState {
  level: number
  title: string
  achievements: Achievement[]
  earned: number
  /** Cuántos faltan para el próximo nivel. `null` si ya está en el máximo. */
  toNext: number | null
  nextTitle: string | null
  /** 0 a 1, para la barra de progreso. */
  progress: number
}

/**
 * La escalera. `at` es cuántos logros hacen falta para entrar al nivel.
 *
 * Se exporta porque la pantalla de niveles muestra los cuatro, no sólo el
 * actual: si sólo se ve el propio, nadie entiende de qué se trata ni qué falta.
 * Es la única definición de los niveles que hay, así que agregar uno acá lo
 * agrega en todas partes.
 *
 * El último pide todos los logros menos uno, cualquiera. Pedía los siete, y
 * "Tres autos activos" un particular que vende su único auto no lo tiene
 * nunca: el nivel de arriba era sólo para agencias. Con seis, el particular
 * que publica, vende y llena el garage llega, y a nadie le cierra la puerta un
 * logro que no le corresponde.
 *
 * El segundo se llamaba "Vendedor", y se gana con el perfil y un auto en el
 * garage, sin haber publicado nada: el nombre afirmaba algo que no pasó.
 */
export const LEVELS = [
  { at: 0, title: 'Recién llegado' },
  { at: 2, title: 'En marcha' },
  { at: 4, title: 'Fierrero' },
  { at: 6, title: 'Referente' },
] as const

export interface LevelInput {
  /** `hasWhatsapp` y no el numero: el logro solo necesita saber si esta
   *  cargado, y desde la migracion 008 el numero no se lee de `profiles`. */
  profile: { name: string; hasWhatsapp: boolean; city: string | null } | null
  /** Activos hoy. Sólo para "Tres autos activos", que habla del presente. */
  activeListings: number
  /** Los que alguna vez salieron publicados: ver `PUBLISHED_STATUSES`. */
  publishedListings: number
  /** Los marcados como vendidos. */
  soldListings: number
  /** Cuántas fotos tiene la publicación con más fotos, entre las publicadas. */
  bestPhotoCount: number
  /** Autos cargados en el garage. */
  garageCars: number
}

export function computeLevel({
  profile,
  activeListings,
  publishedListings,
  soldListings,
  bestPhotoCount,
  garageCars,
}: LevelInput): LevelState {
  const achievements: Achievement[] = [
    {
      id: 'profile_complete',
      title: 'Perfil completo',
      hint: 'Cargá tu nombre, tu WhatsApp y tu ubicación.',
      done: Boolean(profile?.name && profile.hasWhatsapp && profile.city),
    },
    {
      id: 'first_listing',
      title: 'Primera publicación',
      hint: 'Publicá tu primer auto.',
      done: publishedListings >= 1,
    },
    {
      id: 'rich_listing',
      title: 'Publicación completa',
      hint: `Subí ${RICH_PHOTOS} fotos o más en una publicación.`,
      done: bestPhotoCount >= RICH_PHOTOS,
    },
    {
      id: 'three_listings',
      title: 'Tres autos activos',
      hint: 'Tené tres publicaciones activas a la vez.',
      done: activeListings >= 3,
    },
    {
      id: 'first_sale',
      title: 'Primera venta',
      hint: 'Marcá un auto como vendido cuando lo vendas.',
      /* No prueba que hubo una venta: marcar como vendido es una declaración.
         Pero mentirla cuesta el aviso, que sale del listado, y el nivel no es
         una señal de confianza para nadie. Lo que sí hace es premiar la única
         acción que mantiene el listado limpio de autos que ya no están. */
      done: soldListings >= 1,
    },
    {
      id: 'garage_started',
      title: 'Garage abierto',
      hint: 'Sumá el primer auto a tu garage.',
      done: garageCars >= 1,
    },
    {
      id: 'garage_complete',
      title: 'Garage completo',
      hint: 'Llená los cuatro espacios del garage.',
      /* Del largo de la lista y no de un 4 escrito acá: si algún día hay un
         quinto espacio, el logro tiene que seguir pidiendo todos. El texto de
         arriba dice "cuatro" en letras, así que sumar uno obliga también a
         reescribirlo; hay un test que lo recuerda. */
      done: garageCars >= SLOTS.length,
    },
  ]

  const earned = achievements.filter((item) => item.done).length

  /* El nivel es el último umbral alcanzado. */
  let index = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (earned >= LEVELS[i]!.at) index = i
  }

  const current = LEVELS[index]!
  const next = LEVELS[index + 1] ?? null

  return {
    level: index + 1,
    title: current.title,
    achievements,
    earned,
    toNext: next ? next.at - earned : null,
    nextTitle: next ? next.title : null,
    progress: next ? (earned - current.at) / (next.at - current.at) : 1,
  }
}
