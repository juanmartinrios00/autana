/**
 * El precio de referencia al publicar: cuánto piden por autos parecidos que
 * ya están publicados.
 *
 * Es la nota "Cómo ponerle precio a tu auto" hecha herramienta. El precio
 * decide si un aviso recibe consultas o no, y quien publica casi nunca sabe
 * cuánto se pide por lo mismo: pone lo que le dijo el cuñado.
 *
 * Con menos de tres autos no hay referencia: dos precios no son un mercado, y
 * un rango armado con uno solo haría pasar el capricho de un vendedor por
 * precio de plaza. Se muestra la mitad del medio (del cuarto al tercer cuarto)
 * y no el mínimo y el máximo, que en autos usados son casi siempre el que tiene
 * un choque y el que no quiere vender.
 */

export interface Referencia {
  count: number
  /** El cuarto más barato termina acá… */
  low: number
  /** …y el cuarto más caro empieza acá. */
  high: number
  median: number
  /** Dónde cae el precio cargado, si hay uno. */
  position: 'debajo' | 'dentro' | 'encima' | null
}

/** Cuánto afuera de la mitad del medio tiene que estar para decir algo. */
const MARGEN = 0.15

function cuantil(sorted: number[], q: number): number {
  return sorted[Math.round(q * (sorted.length - 1))]!
}

export function referencia(prices: number[], mine?: number): Referencia | null {
  const sorted = prices.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b)
  if (sorted.length < 3) return null

  const low = cuantil(sorted, 0.25)
  const high = cuantil(sorted, 0.75)
  const median = cuantil(sorted, 0.5)

  let position: Referencia['position'] = null
  if (mine && mine > 0) {
    if (mine < low * (1 - MARGEN)) position = 'debajo'
    else if (mine > high * (1 + MARGEN)) position = 'encima'
    else position = 'dentro'
  }

  return { count: sorted.length, low, high, median, position }
}

/**
 * La marca o el modelo, para buscar sin distinguir mayúsculas y sin comodines:
 * es texto libre del formulario, y un `%` o un `_` en un `ilike` buscarían
 * otra cosa.
 */
export function limpiarParaBuscar(texto: string): string {
  return texto.replace(/[^\p{L}\p{N} .-]/gu, '').replace(/\s+/g, ' ').trim()
}
