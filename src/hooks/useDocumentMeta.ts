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
 * Lo que traía el `<head>` estático, para volver a poner cuando una pantalla no
 * define lo suyo.
 *
 * Sin esto, las etiquetas de una pantalla se quedaban puestas en la siguiente:
 * se miraba un aviso, se volvía al listado, y el `<head>` seguía con la
 * descripción de ese auto y su foto como imagen para compartir. El worker
 * reescribe las etiquetas para los bots que leen el HTML crudo, así que el
 * preview de WhatsApp salía bien igual; el que se comía el dato viejo era
 * Google, que sí ejecuta JavaScript y lee lo que quedó en el documento.
 *
 * Se lee una sola vez y en el primer uso, no al importar el módulo: así el
 * valor es el del HTML original, antes de que ninguna pantalla lo pise.
 */
let original: { description: string; image: string } | null = null

function defaults() {
  original ??= {
    description:
      document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    image: document.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
  }
  return original
}

/**
 * Título y metadatos por página.
 *
 * Google ejecuta JavaScript, así que esto le sirve. WhatsApp y las redes NO:
 * leen el HTML crudo, y en un SPA ese HTML es siempre el mismo. De eso se
 * encarga el worker de `worker/index.ts`, que reescribe las etiquetas del
 * `<head>` antes de devolver el HTML en las fichas, los garages y las notas.
 *
 * Los dos caminos tienen que decir lo mismo: si esto y el worker arman textos
 * distintos, el link compartido muestra una cosa y la pestaña otra.
 */
export function useDocumentMeta({ title, description, image, structuredData }: DocumentMeta) {
  useEffect(() => {
    document.title = title
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href)

    const base = defaults()
    const text = description ?? base.description
    upsertMeta('meta[name="description"]', 'name', 'description', text)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', text)
    /* El HTML estático no trae `og:image`, así que la vuelta atrás es sacar la
       etiqueta y no dejarla vacía: un `content=""` es peor que no tenerla, y es
       lo que quedaría en cualquier pantalla que no defina imagen propia. */
    const picture = image ?? base.image
    if (picture) upsertMeta('meta[property="og:image"]', 'property', 'og:image', picture)
    else document.head.querySelector('meta[property="og:image"]')?.remove()
  }, [title, description, image])

  /* El dato se compara ya serializado. `structuredData` se arma como objeto
     literal en la llamada, así que es una referencia nueva en cada render: con
     el objeto como dependencia, el efecto borraba y volvía a crear el `<script>`
     en cada repintado de la ficha ---abrir un desplegable, pasar el mouse por
     una card--- para dejar exactamente el mismo contenido. */
  const json = structuredData ? JSON.stringify(structuredData) : null

  useEffect(() => {
    if (!json) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = json
    document.head.appendChild(script)

    return () => script.remove()
  }, [json])
}
