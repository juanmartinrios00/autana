import type { ReactNode } from 'react'

/**
 * Un aviso al costado del texto, para lo que no hay que pasar por alto.
 *
 * Vive acá y no en `bodies.tsx` para que ese archivo exporte una sola cosa: un
 * archivo que mezcla componentes con otras exportaciones rompe el fast refresh
 * de Vite, y `bodies.tsx` es justo el que más se edita al escribir.
 *
 * Es `<aside>` y no un `<div>` con borde: para un lector de pantalla esto es
 * contenido relacionado y no parte del hilo del artículo, que es exactamente
 * lo que significa visualmente.
 */
export function Note({ children }: { children: ReactNode }) {
  return <aside className="prose__note">{children}</aside>
}
