/**
 * La ventana de páginas que se dibuja al pie de los resultados.
 *
 * Pintar un botón por página funciona mientras la base tenga cien autos y deja
 * de funcionar sola: con cinco mil publicaciones y doce por página son más de
 * cuatrocientos botones, que es una fila que se dobla en seis renglones y tarda
 * más en pintarse que la grilla que está paginando. La ventana corta eso en un
 * ancho fijo: siempre la primera, siempre la última, la actual con su vecina de
 * cada lado, y puntos suspensivos en el medio.
 */

/** Un número de página, o el hueco que se dibuja como `…`. */
export type PageSlot = number | 'gap'

/* Siete espacios: `1 … 4 5 6 … 42`. Es lo más angosto que deja ver a la vez la
   página anterior y la siguiente sin que la fila salte de ancho al moverse. */
const SLOTS = 7

export function pageWindow(page: number, pageCount: number): PageSlot[] {
  if (pageCount < 1) return []

  const current = Math.min(Math.max(page, 1), pageCount)
  const all = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index)

  if (pageCount <= SLOTS) return all(1, pageCount)

  /* Cerca de un extremo la ventana no se centra: se apoya contra el borde. Si
     se centrara, al estar en la 2 el hueco de la izquierda taparía la 1 sola, y
     un `…` que esconde una única página ocupa lo mismo que el número. */
  if (current <= 4) return [...all(1, 5), 'gap', pageCount]
  if (current >= pageCount - 3) return [1, 'gap', ...all(pageCount - 4, pageCount)]

  return [1, 'gap', ...all(current - 1, current + 1), 'gap', pageCount]
}
