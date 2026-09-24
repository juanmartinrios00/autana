import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { compartir } from '../../lib/share'
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
export function ShareButton({
  title,
  price,
  block,
  url: propia,
}: {
  title: string
  price: string
  block?: boolean
  /** Cuál compartir, si no es la pantalla en la que se está: recién publicado,
   *  el aviso vive en otra dirección que la del formulario. */
  url?: string
}) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = propia ?? window.location.href
    const hecho = await compartir({ title, text: shareMessage(title, price, url), url })
    if (hecho !== 'copiado') return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" block={block} onClick={() => void share()}>
      <Icon name="link" size={16} />
      {copied ? 'Link copiado' : 'Compartir'}
    </Button>
  )
}
