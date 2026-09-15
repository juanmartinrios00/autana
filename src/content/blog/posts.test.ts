import { describe, expect, it } from 'vitest'
import { findPost, posts, postsByDate } from './posts'

/**
 * Los artículos están partidos en dos archivos: los metadatos en `posts.ts` y
 * el cuerpo en `bodies.tsx`. Es a propósito —el Worker no puede importar
 * JSX— pero abre una forma de romperlo que no avisa: agregar uno de los dos
 * lados y olvidarse del otro.
 *
 * El listado seguiría mostrando la tarjeta y el artículo tiraría "no
 * encontrado", o al revés: un artículo escrito que no aparece en ningún lado.
 * Ninguna de las dos cosas rompe el build.
 *
 * `bodies.tsx` se importa dinámicamente porque este archivo es `.ts` y corre
 * en el entorno `node` de vitest, sin el plugin de React.
 */

describe('los metadatos', () => {
  it('no repiten slug', () => {
    const slugs = posts.map((post) => post.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('usan slugs que entran en una URL', () => {
    for (const post of posts) {
      expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('tienen fecha válida', () => {
    for (const post of posts) {
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(post.date))).toBe(false)
    }
  })

  it('tienen título y resumen con algo adentro', () => {
    for (const post of posts) {
      expect(post.title.length).toBeGreaterThan(10)
      expect(post.summary.length).toBeGreaterThan(40)
      expect(post.minutes).toBeGreaterThan(0)
    }
  })
})

describe('el orden y la búsqueda', () => {
  it('devuelve del más nuevo al más viejo', () => {
    const dates = postsByDate().map((post) => post.date)
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)))
  })

  it('no inventa un artículo que no existe', () => {
    expect(findPost('no-existe')).toBeUndefined()
  })

  it('encuentra cada uno por su slug', () => {
    for (const post of posts) {
      expect(findPost(post.slug)?.title).toBe(post.title)
    }
  })
})

describe('metadatos y cuerpos', () => {
  it('cada artículo tiene su cuerpo, y cada cuerpo su artículo', async () => {
    const { bodies } = await import('./bodies')
    expect(Object.keys(bodies).sort()).toEqual(posts.map((post) => post.slug).sort())
  })
})
