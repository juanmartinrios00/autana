/**
 * Compartir algo: el menú del sistema en el celular, el portapapeles en una
 * computadora.
 *
 * En el celular ese menú ya tiene los contactos de WhatsApp arriba de todo, que
 * es a donde va a parar un auto o un garage en este país. En escritorio existe
 * en algunos navegadores pero sin destinos útiles, así que ahí se copia, que es
 * lo que uno haría a mano.
 *
 * Devuelve qué pasó, para que el botón pueda decir "Link copiado" sólo cuando
 * de verdad lo copió. `null` es que no se pudo hacer ninguna de las dos cosas
 * ---sin permiso de portapapeles, o el menú cancelado--- y en ese caso no hay
 * nada que avisar: el link está en la barra de direcciones, que es de donde lo
 * iba a sacar igual.
 */

export type Compartido = 'sistema' | 'copiado' | null

/** El menú del sistema existe y tiene sentido: sólo en teléfonos. */
function hayMenuDeSistema(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    /Android|iPhone|iPad/i.test(navigator.userAgent)
  )
}

export async function compartir({
  title,
  text,
  url,
}: {
  title: string
  /** Lo que se manda. Si no viene, va el título y el link. */
  text?: string
  url: string
}): Promise<Compartido> {
  const mensaje = text ?? `${title}\n\n${url}`

  if (hayMenuDeSistema()) {
    try {
      await navigator.share({ title, text: mensaje })
      return 'sistema'
    } catch {
      /* Cancelar el menú tira un error: no es una falla y no se avisa. */
      return null
    }
  }

  try {
    await navigator.clipboard.writeText(mensaje)
    return 'copiado'
  } catch {
    return null
  }
}
