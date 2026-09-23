import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { shareMessage } from '../../lib/whatsapp'

/**
 * Compartir un aviso.
 *
 * Un auto se pasa por WhatsApp: "mirá este". Hasta ahora había que copiar la
 * dirección de la barra del navegador, que en un celular es justo lo que nadie
 * hace.
 *
 * En el celular usa el menú del sistema, que ya tiene los contactos de
 * WhatsApp arriba de todo y también sirve para Instagram o un mail. En una
 * computadora ese menú no existe, así que copia el link, que es lo que uno
 * haría a mano.
 *
 * El texto lleva el precio adelante y el link solo al final: así WhatsApp lo
 * convierte en una tarjeta con la foto, que sale de las etiquetas que pone el
 * worker.
 */
export function ShareButton({ title, price, block }: { title: string; price: string; block?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    const text = shareMessage(title, price, url)

    /* `share` existe en escritorio en algunos navegadores, pero sin destinos
       útiles; el celular es donde vale. `canShare` no se pregunta porque sin
       archivos siempre dice que sí. */
    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        /* Cancelar el menú tira un error: no es una falla y no se avisa. */
        return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Sin permiso de portapapeles no queda nada que hacer desde acá. */
    }
  }

  return (
    <Button variant="outline" block={block} onClick={() => void share()}>
      <Icon name="link" size={16} />
      {copied ? 'Link copiado' : 'Compartir'}
    </Button>
  )
}
