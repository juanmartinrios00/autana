import { useEffect } from 'react'

export interface DocumentMeta {
  title: string
  description?: string
  /** Imagen para la preview al compartir el link. */
  image?: string
  /** JSON-LD, para que Google entienda de qué se trata la página. */
  structuredData?: Record<string, unknown>
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', value)
}

/**
 * Título y metadatos por página.
 *
 * Google ejecuta JavaScript, así que esto le sirve. WhatsApp y las redes NO:
 * leen el HTML crudo, y en un SPA ese HTML es siempre el mismo. Para que un
 * aviso compartido muestre preview hace falta resolverlo en el servidor
 * (una Pages Function que inyecte las etiquetas para los bots).
 */
export function useDocumentMeta({ title, description, image, structuredData }: DocumentMeta) {
  useEffect(() => {
    document.title = title
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href)

    if (description) {
      upsertMeta('meta[name="description"]', 'name', 'description', description)
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }

    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)
    }
  }, [title, description, image])

  useEffect(() => {
    if (!structuredData) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => script.remove()
  }, [structuredData])
}
