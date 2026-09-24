import type { ComponentType } from 'react'

/**
 * Los dibujos de los estados vacíos, por nombre.
 *
 * Cada pantalla ya pide el suyo (`<EmptyState scene="sinResultados" />`). Si
 * el dibujo no está en este mapa, `EmptyState` muestra el ícono de siempre, así
 * que se pueden ir sumando de a uno sin tocar ninguna pantalla.
 *
 * Qué va en cada uno, y el contrato que tienen que cumplir (viewBox, trazo,
 * un solo acento), está en `docs/brief-ilustraciones.md`.
 */
export type EmptySceneName =
  /** Una búsqueda sin resultados: autos, gente, ayuda. */
  | 'sinResultados'
  /** Algo que no existe: un aviso, una nota, un perfil, la página. */
  | 'noExiste'
  /** No se pudo cargar: la conexión o la base. */
  | 'sinConexion'
  /** Favoritos, sin ningún auto guardado. */
  | 'sinFavoritos'
  /** Novedades, sin nada todavía. */
  | 'sinNovedades'
  /** Comparar, sin ningún auto elegido. */
  | 'sinComparar'

/** Todos, para el catálogo de `/sistema`, que muestra cuáles faltan. */
export const EMPTY_SCENE_NAMES: EmptySceneName[] = [
  'sinResultados',
  'noExiste',
  'sinConexion',
  'sinFavoritos',
  'sinNovedades',
  'sinComparar',
]

export const EMPTY_SCENES: Partial<Record<EmptySceneName, ComponentType<{ className?: string }>>> = {}
