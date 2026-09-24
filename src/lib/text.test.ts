import { describe, expect, it } from 'vitest'
import { contieneTodas, plano } from './text'

describe('plano', () => {
  it('saca tildes y mayúsculas', () => {
    expect(plano('Citroën')).toBe('citroen')
    expect(plano('PUBLICACIÓN')).toBe('publicacion')
  })
})

describe('contieneTodas', () => {
  it('encuentra la palabra tal cual', () => {
    expect(contieneTodas('¿Cómo le escribo al vendedor?', 'vendedor')).toBe(true)
  })

  it('pide todas las palabras, no alguna', () => {
    expect(contieneTodas('¿Cómo comparo dos autos?', 'comparo autos')).toBe(true)
    expect(contieneTodas('¿Cómo comparo dos autos?', 'comparo camiones')).toBe(false)
  })

  /* El caso que lo motivó: quien busca escribe "transferencia" y el texto dice
     "transferir". Sin esto, el buscador contesta que no hay nada. */
  it('junta palabras de la misma familia', () => {
    expect(contieneTodas('Cómo transferir un auto', 'transferencia')).toBe(true)
    expect(contieneTodas('¿Cuánto cuesta publicar?', 'publicacion')).toBe(true)
    expect(contieneTodas('¿Cómo le escribo al vendedor?', 'vender')).toBe(true)
  })

  it('sin tildes ni mayúsculas, en los dos lados', () => {
    expect(contieneTodas('¿Qué significa el sello Verificada?', 'VERIFICADA')).toBe(true)
    expect(contieneTodas('Publicación completa', 'publicacion')).toBe(true)
  })

  /* Tres letras no son una familia: "aut" no puede traer "auto", "autor" y
     "automático" como si fueran lo mismo. Por eso el mínimo. */
  it('no junta cualquier cosa que empiece parecido', () => {
    expect(contieneTodas('¿Cómo borro mi cuenta?', 'contraseña')).toBe(false)
    expect(contieneTodas('¿Qué es el garage?', 'garantia')).toBe(false)
  })

  it('lo escrito vacío no filtra nada', () => {
    expect(contieneTodas('cualquier cosa', '   ')).toBe(true)
  })
})
