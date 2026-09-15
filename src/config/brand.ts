/**
 * El nombre de la marca, en un solo lugar.
 *
 * Antes estaba escrito a mano en unos sesenta lugares: títulos de pestaña,
 * descripciones para Google, el asunto del mail de contacto, el mensaje que se
 * manda por WhatsApp, el pie, la navbar y el texto de las páginas legales.
 * Cambiar el nombre era una búsqueda y reemplazo por treinta archivos, con el
 * riesgo de pisar justo la palabra dentro de un test.
 *
 * Desde acá se cambia en un lugar, la aplicación y el Worker incluidos. Queda
 * afuera uno solo, que no puede importar un módulo de TypeScript y hay que
 * tocar a mano: `index.html`, con el título y las etiquetas que leen las redes
 * antes de que corra el JavaScript.
 */
export const BRAND = 'Autana'

/**
 * Título de pestaña, con la marca al final: `Favoritos | Autana`.
 *
 * La portada no lo usa: ahí el nombre va primero, que es lo que muestra Google
 * como título del resultado.
 */
export function pageTitle(section: string): string {
  return `${section} | ${BRAND}`
}
