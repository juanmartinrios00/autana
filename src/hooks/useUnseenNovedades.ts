import { useEffect, useState } from 'react'
import { listNovedades } from '../lib/api'
import { useAuth } from './useAuth'

/** Se dispara cuando se abren las novedades, para que la campanita baje a cero. */
export const NOVEDADES_SEEN_EVENT = 'autana:novedades-seen'

/* Cada dos minutos, y además al volver a la pestaña. Más seguido sería una
   consulta por minuto por cada pestaña abierta para algo que no es un chat;
   menos, y alguien vuelve a la pestaña y ve un número viejo. Por eso volver
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

    /* Con la pestaña de fondo no se consulta. El número que importa es el que
       se ve al volver, y volver ya dispara una consulta: mientras tanto, el
       intervalo es una consulta cada dos minutos, por pestaña abierta, contra
       algo que nadie está mirando. */
    const tick = () => {
      if (!document.hidden) refresh()
    }

    /* `focus` solo no alcanza. Cambiar de pestaña dentro de la misma ventana no
       le saca el foco a la ventana, así que volver desde una pestaña hermana
       ---que es como se mueve la mayoría--- no disparaba nada, y la campanita
       seguía mostrando el número de hasta dos minutos antes. `visibilitychange`
       cubre ese caso; `focus` queda para volver desde otra aplicación, donde la
       pestaña nunca dejó de ser visible. */
    const onVisible = () => {
      if (!document.hidden) refresh()
    }

    refresh()
    const timer = window.setInterval(tick, EVERY_MS)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(NOVEDADES_SEEN_EVENT, onSeen)

    return () => {
      current = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(NOVEDADES_SEEN_EVENT, onSeen)
    }
  }, [userId])

  /* De otra cuenta, o de antes de cerrar sesión: no cuenta. */
  return unseen.for === userId ? unseen.count : 0
}
