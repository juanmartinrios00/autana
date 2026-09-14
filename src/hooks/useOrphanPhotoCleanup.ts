import { useEffect } from 'react'
import { cleanOrphanPhotos } from '../lib/api'
import { useAuth } from './useAuth'

/**
 * Borra, una vez por sesión, las fotos propias que ya no usa nada.
 *
 * Va en el layout y no en una pantalla porque tiene que correr para cualquiera
 * que entre con sesión, llegue por donde llegue: desde que el garage es el
 * perfil público, casi nadie pasa por `/profile`.
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
    const key = `autana:orphan-photos:${userId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    /* En silencio: es mantenimiento. Si falla, vuelve a intentar en la próxima
       sesión, y mientras tanto no cambia nada de lo que se ve. */
    void cleanOrphanPhotos(userId).catch(() => {})
  }, [userId])
}
