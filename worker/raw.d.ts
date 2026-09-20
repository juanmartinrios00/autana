/**
 * Los imports con `?raw`, que Vite resuelve al contenido del archivo como texto.
 *
 * Se declara acá y no con el `types` del tsconfig porque este proyecto carga
 * sólo `@cloudflare/workers-types`: sumarle `vite/client` traería el DOM entero
 * a un worker que no lo tiene, y es justo lo que el tipado quiere impedir.
 *
 * La app no necesita esta declaración porque su tsconfig sí incluye los tipos
 * de Vite, que ya la traen.
 */
declare module '*?raw' {
  const contenido: string
  export default contenido
}
