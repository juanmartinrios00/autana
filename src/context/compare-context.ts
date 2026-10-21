import { createContext } from 'react'

/** Tres es el tope: es lo que entra al lado del otro sin volverse ilegible. */
export const MAX_COMPARE = 3

export interface CompareValue {
  /** Los slugs elegidos, en el orden en que se fueron sumando. */
  slugs: string[]
  has: (slug: string) => boolean
  /** El nombre con que se eligió: marca, modelo y año como estaban en la card. */
  nameOf: (slug: string) => string
  /** Suma o saca un auto; `name` es lo que va a decir la barra. */
  toggle: (slug: string, name: string) => void
  remove: (slug: string) => void
  clear: () => void
  /** `true` cuando ya hay tres y no entra otro. */
  full: boolean
}

export const CompareContext = createContext<CompareValue | null>(null)
