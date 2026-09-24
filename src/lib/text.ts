/**
 * Texto para comparar: sin tildes, sin mayúsculas.
 *
 * Nadie escribe "Citroën" con diéresis en un buscador, ni "publicación" con
 * tilde cuando está apurado. Lo usan las sugerencias del buscador de autos y
 * el buscador de la ayuda; estaba escrito dos veces.
 */
export function plano(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Cuántas letras tienen que compartir dos palabras para ser la misma familia. */
const RAIZ = 5

/**
 * ¿Todas las palabras escritas aparecen en el texto?
 *
 * Por palabra suelta y no como frase: "transferir auto" encuentra "Cómo
 * transferir un auto", que con la frase entera no aparecería.
 *
 * Y por familia de palabras, no por texto exacto: quien busca escribe
 * "transferencia" y el texto dice "transferir", o escribe "publicacion" y el
 * texto dice "publicar". Con cinco letras compartidas al principio alcanza
 * para juntarlas. Es tosco ---"compra" y "comparar" comparten "compa"--- pero
 * en un buscador de ayuda un resultado de más molesta mucho menos que uno de
 * menos: lo que pasa cuando no encuentra nada es que la persona se va.
 */
export function contieneTodas(texto: string, busqueda: string): boolean {
  const palabras = plano(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

  return plano(busqueda)
    .split(/\s+/)
    .filter(Boolean)
    .every((buscada) =>
      palabras.some((palabra) => {
        if (palabra.includes(buscada)) return true
        if (buscada.length < RAIZ || palabra.length < RAIZ) return false
        return palabra.slice(0, RAIZ) === buscada.slice(0, RAIZ)
      }),
    )
}
