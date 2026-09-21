import { useEffect } from 'react'
import { cleanOrphanPhotos } from '../lib/api'
import { useAuth } from './useAuth'

/**
 * Borra, una vez por sesión, las fotos propias que ya no usa nada.
 *
 * Va en el layout y no en una pantalla porque tiene que correr para cualquiera
 * que entre con sesión, llegue por donde llegue: desde que el garage es el
 * perfil público, casi nadie pasa por `/perfil`.
 *
 * Una vez por sesión del navegador y no en cada carga: son dos listados de
 * Storage, y las huérfanas nuevas ya no se generan —esto limpia las que
 * quedaron de antes y las de algún borrado que haya fallado—.
 */
export function useOrphanPhotoCleanup(): void {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  useEffect(() => {
    if (!userId) return

    /* Con las cookies de terceros bloqueadas o en algunos modos privados,
       `sessionStorage` no devuelve null: tira. Y esto corre en el layout, para
       cualquiera que entre con sesión, así que sin el `try` toda esa gente ve
       la pantalla de error en vez del sitio ---por una limpieza que ni siquiera
       es parte de lo que vino a hacer.

       Sin memoria la limpieza corre una vez por carga en lugar de una por
       sesión. Son dos listados de Storage y no cambia nada de lo que se ve:
       cuesta menos que no correrla. */
    const key = `autana:orphan-photos:${userId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* Se sigue igual, sin la marca. */
    }

    /* En silencio: es mantenimiento. Si falla, vuelve a intentar en la próxima
       sesión, y mientras tanto no cambia nada de lo que se ve. */
    void cleanOrphanPhotos(userId).catch(() => {})
  }, [userId])
}
