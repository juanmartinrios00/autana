/**
 * Las sugerencias del buscador de la navbar.
 *
 * Salen de lo que está publicado, no de un catálogo de todos los autos que
 * existen: sugerir "Toyota Etios" cuando no hay ninguno es mandar a alguien a
 * una búsqueda vacía con un clic. Por eso cada una dice cuántos hay.
 *
 * Elegir una sugerencia aplica marca y modelo como filtros, no como texto: el
 * texto busca "hilux" en cualquier parte, el filtro trae la Hilux y nada más,
 * y queda como chip que se saca con la ×.
 */

import { plano } from './text'

export interface MakeModelCount {
  make: string
  model: string
  count: number
}

export interface Suggestion {
  make: string
  /** Sin modelo es la marca entera: "Toyota, todos los modelos". */
  model?: string
  count: number
}

const MAX = 6

/**
 * Cada palabra escrita tiene que ser el principio de alguna palabra de la
 * marca o del modelo: "hil" → Toyota Hilux, "toyota h" → Toyota Hilux, "ota"
 * no trae nada. Por el principio y no en cualquier parte, porque en
 * cualquier parte "a" sugiere todo el listado.
 *
 * Arriba va la marca entera si lo escrito la nombra, y después los modelos,
 * los que más autos tienen primero.
 */
export function suggest(pairs: MakeModelCount[], text: string): Suggestion[] {
  const terms = plano(text).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const encaja = (words: string[]) =>
    terms.every((term) => words.some((word) => word.startsWith(term)))

  const models = pairs
    .filter((pair) => encaja(plano(`${pair.make} ${pair.model}`).split(/\s+/)))
    .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model))

  /* La marca entera sólo si todo lo escrito cabe en su nombre: con "toyota"
     sí, con "toyota hilux" ya se eligió el modelo. Y sólo si tiene más de un
     modelo publicado: si no, "Renault, todos" y "Renault Symbol" son el mismo
     renglón dos veces. */
  const porMarca = new Map<string, number>()
  const modelos = new Map<string, number>()
  for (const pair of pairs) {
    porMarca.set(pair.make, (porMarca.get(pair.make) ?? 0) + pair.count)
    modelos.set(pair.make, (modelos.get(pair.make) ?? 0) + 1)
  }
  const makes = [...porMarca]
    .filter(([make]) => (modelos.get(make) ?? 0) > 1 && encaja(plano(make).split(/\s+/)))
    .sort((a, b) => b[1] - a[1])
    .map(([make, count]) => ({ make, count }))

  return [...makes, ...models.map(({ make, model, count }) => ({ make, model, count }))].slice(0, MAX)
}
