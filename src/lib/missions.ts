/**
 * Las misiones: el próximo logro, dicho donde se puede hacer.
 *
 * La lista de logros vive en `/niveles` y en el perfil, y ahí es una lista: dice
 * "Subí 8 fotos o más en una publicación" sin decir en cuál ni cuántas faltan.
 * Quien está en sus avisos no va a ir a leerla. Una misión es el mismo logro
 * dicho con los datos de la pantalla ---"A tu Renault Symbol le faltan 3
 * fotos"--- y con el botón que lo resuelve al lado.
 *
 * No calcula logros por su cuenta: los umbrales salen de `levels.ts`. Si un
 * logro se afloja allá, la misión acompaña.
 *
 * Una misión por pantalla, nunca una lista. Cuatro avisos de "te falta esto"
 * arriba de los autos son un panel de tareas pendientes, y lo que se quiere es
 * que la persona haga una cosa.
 */

import { computeLevel, PUBLISHED_STATUSES, RICH_PHOTOS, type AchievementId, type LevelState } from './levels'
import { SLOTS } from '../data/garage-slots'
import type { Vehicle } from '../types'

export interface Mission {
  /** El logro que se gana. Su título sale de `levels.ts`, no se repite acá. */
  achievement: AchievementId
  title: string
  text: string
  /** El botón que la resuelve. Sin él cuando el botón ya está en la pantalla
   *  ---"Marcar vendido" está en cada fila de Mis avisos--- y repetirlo sería
   *  un segundo botón que hace lo mismo. */
  action?: { label: string; to: string }
}

type ListingForMission = Pick<Vehicle, 'make' | 'model' | 'slug' | 'status' | 'images'>

function titleOf(achievement: AchievementId): string {
  /* De una corrida vacía: los títulos no dependen de los datos. */
  return computeLevel({
    profile: null,
    activeListings: 0,
    publishedListings: 0,
    soldListings: 0,
    bestPhotoCount: 0,
    garageCars: 0,
  }).achievements.find((item) => item.id === achievement)!.title
}

const fotos = (n: number) => (n === 1 ? 'foto' : 'fotos')

/**
 * "Publicación completa" para un aviso en particular, o nada si ya la tiene.
 * La usan Mis avisos y la pantalla de recién publicado, que es el mismo
 * consejo sobre el mismo auto.
 */
export function photosMission(listing: Pick<Vehicle, 'make' | 'model' | 'slug'>, photos: number): Mission | null {
  const missing = RICH_PHOTOS - photos
  if (missing <= 0) return null
  const achievement = 'rich_listing'
  return {
    achievement,
    title: titleOf(achievement),
    text: `A tu ${listing.make} ${listing.model} le ${missing === 1 ? 'falta' : 'faltan'} ${missing} ${fotos(missing)} para «${titleOf(achievement)}». Los avisos con más fotos reciben más consultas.`,
    action: { label: 'Sumar fotos', to: `/vender/${listing.slug}/editar` },
  }
}

/**
 * La misión de Mis avisos, sacada de los avisos que la pantalla ya cargó: no
 * hace falta otra consulta.
 *
 * Van en orden de lo que más ayuda a vender:
 *
 *   1. Fotos. Si ningún aviso llegó a ocho, se le pide al activo que más tiene,
 *      que es el que menos le falta. A uno vendido no: ya no le sirven.
 *   2. Marcar vendido. Sólo si hay algo activo que se pueda vender, y sin botón
 *      propio porque está en la fila.
 *
 * "Tres autos activos" no se pide acá a propósito. A una agencia le llega
 * sola, y a un particular que vende su único auto decirle "publicá dos más"
 * es pedirle algo que no tiene.
 */
export function listingMission(listings: ListingForMission[]): Mission | null {
  const published = listings.filter((item) => PUBLISHED_STATUSES.includes(item.status))
  if (published.length === 0) return null

  const active = published.filter((item) => item.status === 'active')
  const best = Math.max(...published.map((item) => item.images.length))

  if (best < RICH_PHOTOS) {
    /* El activo con más fotos; si no hay activos, el pausado con más. */
    const candidates = active.length > 0 ? active : published.filter((item) => item.status === 'paused')
    const pick = [...candidates].sort((a, b) => b.images.length - a.images.length)[0]
    if (pick) return photosMission(pick, pick.images.length)
  }

  const sold = published.some((item) => item.status === 'sold')
  if (!sold && active.length > 0) {
    const achievement = 'first_sale'
    const which = active.length === 1 ? `tu ${active[0]!.make} ${active[0]!.model}` : 'uno'
    return {
      achievement,
      title: titleOf(achievement),
      text: `Cuando vendas ${which}, tocá «Marcar vendido»: sumás «${titleOf(achievement)}» y dejan de escribirte por un auto que ya no está.`,
    }
  }

  return null
}

/** La del garage propio: el primero, y después llenarlo. */
export function garageMission(filled: number): Mission | null {
  if (filled >= SLOTS.length) return null
  const achievement = filled === 0 ? 'garage_started' : 'garage_complete'
  const missing = SLOTS.length - filled
  return {
    achievement,
    title: titleOf(achievement),
    text:
      filled === 0
        ? `Cargá el primero y sumás «${titleOf(achievement)}».`
        : `Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} para «${titleOf(achievement)}».`,
  }
}

/**
 * Lo que cambió entre dos estados del nivel: los logros que se ganaron y, si
 * se subió, a qué nivel. Para la pantalla de recién publicado, que es el
 * momento en que alguien gana un logro sin saberlo.
 */
export function levelChange(before: LevelState, after: LevelState) {
  const had = new Set(before.achievements.filter((item) => item.done).map((item) => item.id))
  return {
    earned: after.achievements.filter((item) => item.done && !had.has(item.id)),
    newLevel: after.level > before.level ? after.title : null,
  }
}
