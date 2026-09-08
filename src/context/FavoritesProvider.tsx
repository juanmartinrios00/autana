import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { addFavorite, listFavoriteIds, mergeFavorites, removeFavorite } from '../lib/api'
import { FavoritesContext, type FavoritesValue } from './favorites-context'

const STORAGE_KEY = 'autana:favorites'

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    /* Ventana privada, storage bloqueado: se arranca sin favoritos. */
    return []
  }
}

function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* No poder persistir no debe romper la navegación. */
  }
}

/**
 * Favoritos, con dos fuentes según haya sesión o no.
 *
 * Sin cuenta siguen viviendo en el navegador: alguien que recién llega tiene
 * que poder guardar un auto sin registrarse primero, o lo perdemos ahí mismo.
 * Con cuenta manda la base, que es lo que hace que sobrevivan al cambio de
 * teléfono.
 *
 * Al iniciar sesión los del navegador se suben y se mezclan con los que ya
 * había en la cuenta, y recién ahí se limpia el storage: el que venía mirando
 * sin cuenta no pierde nada al registrarse.
 *
 * Los cambios se pintan primero y se guardan después. Un corazón que tarda
 * medio segundo en llenarse se siente roto, así que la UI no espera a la red;
 * si la escritura falla, se revierte y se avisa.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user.id ?? ''

  const [ids, setIds] = useState<string[]>(readLocal)
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* Con qué cuenta se sincronizó la lista que hay en memoria. Sirve para no
     re-sincronizar en cada refresh de token, que trae una sesión nueva pero
     el mismo usuario. */
  const syncedFor = useRef<string | null>(null)

  useEffect(() => {
    /* Mientras Supabase resuelve el token no se sabe si hay usuario: tocar
       algo acá haría parpadear la lista o subir favoritos a la nada. */
    if (authLoading) return

    if (!userId) {
      /* Se cerró sesión: se vuelve a lo que haya en el navegador. Los de la
         cuenta quedan en la base, esperando al próximo ingreso. */
      if (syncedFor.current !== null) {
        syncedFor.current = null
        setIds(readLocal())
      }
      return
    }

    if (syncedFor.current === userId) return
    syncedFor.current = userId

    let current = true
    setLoading(true)

    const pending = readLocal()

    void mergeFavorites(userId, pending)
      .then(() => listFavoriteIds(userId))
      .then((saved) => {
        if (!current) return
        setIds(saved)
        /* Ya están en la cuenta: dejarlos también acá haría que reaparezcan
           al cerrar sesión, como fantasmas de otro usuario. */
        writeLocal([])
        setFailure(null)
      })
      .catch((cause) => {
        if (!current) return
        console.error('sincronizar favoritos', cause)
        /* Si falla, se sigue con los del navegador y se permite reintentar. */
        syncedFor.current = null
        setFailure('No pudimos sincronizar tus favoritos con tu cuenta.')
      })
      .finally(() => {
        if (current) setLoading(false)
      })

    return () => {
      current = false
    }
  }, [authLoading, userId])

  /* Sin sesión, cada cambio se espeja en el storage. Con sesión no, porque la
     copia buena está en la base. */
  useEffect(() => {
    if (authLoading || userId) return
    writeLocal(ids)
  }, [ids, userId, authLoading])

  const has = useCallback((vehicleId: string) => ids.includes(vehicleId), [ids])

  const toggle = useCallback(
    (vehicleId: string) => {
      const wasSaved = ids.includes(vehicleId)
      const next = wasSaved ? ids.filter((id) => id !== vehicleId) : [...ids, vehicleId]

      setIds(next)
      setFailure(null)

      if (!userId) return

      const write = wasSaved
        ? removeFavorite(userId, vehicleId)
        : addFavorite(userId, vehicleId)

      void write.catch((cause) => {
        console.error('guardar favorito', cause)
        /* Se vuelve atrás sobre el estado real del momento, no sobre `next`:
           entre el clic y el error el usuario pudo tocar otros corazones. */
        setIds((current) =>
          wasSaved
            ? current.includes(vehicleId)
              ? current
              : [...current, vehicleId]
            : current.filter((id) => id !== vehicleId),
        )
        setFailure('No pudimos guardar el cambio. Fijate la conexión.')
      })
    },
    [ids, userId],
  )

  const clear = useCallback(() => {
    const previous = ids
    setIds([])

    if (!userId) return

    void Promise.all(previous.map((id) => removeFavorite(userId, id))).catch((cause) => {
      console.error('vaciar favoritos', cause)
      setIds(previous)
      setFailure('No pudimos vaciar la lista.')
    })
  }, [ids, userId])

  const value = useMemo<FavoritesValue>(
    () => ({ ids, has, toggle, clear, loading, failure, synced: Boolean(userId) }),
    [ids, has, toggle, clear, loading, failure, userId],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
