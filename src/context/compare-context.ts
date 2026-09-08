import { createContext } from 'react'

/** Tres es el tope: es lo que entra al lado del otro sin volverse ilegible. */
export const MAX_COMPARE = 3

export interface CompareValue {
  /** Los slugs elegidos, en el orden en que se fueron sumando. */
  slugs: string[]
  has: (slug: string) => boolean
  toggle: (slug: string) => void
  remove: (slug: string) => void
  clear: () => void
  /** `true` cuando ya hay tres y no entra otro. */
  full: boolean
}

export const CompareContext = createContext<CompareValue | null>(null)
