import { useEffect, useState } from 'react'
import { listNovedades } from '../lib/api'
import { useAuth } from './useAuth'

/** Se dispara cuando se abren las novedades, para que la campanita baje a cero. */
export const NOVEDADES_SEEN_EVENT = 'autana:novedades-seen'

/* Cada dos minutos, y además al volver a la pestaña. Más seguido sería una
   consulta por minuto por cada pestaña abierta para algo que no es un chat;
   menos, y alguien vuelve a la pestaña y ve un número viejo. Por eso el foco
   pesa más que el intervalo. */
const EVERY_MS = 120_000

/**
 * Cuántas novedades hay sin ver, para la campanita.
 *
 * Trae la lista entera y cuenta: la función de la base topea en 30, así que no
 * hace falta otra consulta sólo para el número.
 */
export function useUnseenNovedades(): number {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''
  const [unseen, setUnseen] = useState<{ for: string; count: number }>({ for: '', count: 0 })

  useEffect(() => {
    if (!userId) return
    let current = true

    const refresh = () => {
      listNovedades()
        .then((items) => {
          if (current) setUnseen({ for: userId, count: items.filter((item) => item.unseen).length })
        })
        .catch(() => {
          /* Sin novedades no se rompe nada: la campanita queda sin número. */
        })
    }

    const onSeen = () => setUnseen({ for: userId, count: 0 })
    const onFocus = () => refresh()

    refresh()
    const timer = window.setInterval(refresh, EVERY_MS)
    window.addEventListener('focus', onFocus)
    window.addEventListener(NOVEDADES_SEEN_EVENT, onSeen)

    return () => {
      current = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(NOVEDADES_SEEN_EVENT, onSeen)
    }
  }, [userId])

  /* De otra cuenta, o de antes de cerrar sesión: no cuenta. */
  return unseen.for === userId ? unseen.count : 0
}
