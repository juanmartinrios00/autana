/**
 * Niveles y logros.
 *
 * El nivel NO se guarda en ningún lado: es una función pura de datos que ya
 * existen. Eso evita el problema clásico de estos sistemas, que es que el
 * contador guardado se desincroniza del mundo real y termina premiando a
 * quien borró una publicación. Si el dato cambia, el nivel cambia solo.
 *
 * Todos los logros son verificables. Ninguno se otorga "por participar".
 */

export type AchievementId =
  | 'profile_complete'
  | 'first_listing'
  | 'rich_listing'
  | 'three_listings'
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

const LEVELS = [
  { at: 0, title: 'Recién llegado' },
  { at: 2, title: 'Vendedor' },
  { at: 4, title: 'Fierrero' },
  { at: 6, title: 'Referente' },
] as const

export interface LevelInput {
  profile: { name: string; whatsapp: string | null; city: string | null } | null
  activeListings: number
  /** Cuántas fotos tiene la publicación con más fotos. */
  bestPhotoCount: number
  /** Autos cargados en el garage. */
  garageCars: number
}

export function computeLevel({
  profile,
  activeListings,
  bestPhotoCount,
  garageCars,
}: LevelInput): LevelState {
  const achievements: Achievement[] = [
    {
      id: 'profile_complete',
      title: 'Perfil completo',
      hint: 'Cargá tu nombre, tu WhatsApp y tu ubicación.',
      done: Boolean(profile?.name && profile.whatsapp && profile.city),
    },
    {
      id: 'first_listing',
      title: 'Primera publicación',
      hint: 'Publicá tu primer auto.',
      done: activeListings >= 1,
    },
    {
      id: 'rich_listing',
      title: 'Publicación completa',
      hint: 'Subí 8 fotos o más en una publicación.',
      done: bestPhotoCount >= 8,
    },
    {
      id: 'three_listings',
      title: 'Tres autos activos',
      hint: 'Tené tres publicaciones activas a la vez.',
      done: activeListings >= 3,
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
      done: garageCars >= 4,
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
