import { createContext } from 'react'
import type { Session } from '../lib/auth'

export interface AuthValue {
  session: Session | null
  /** `true` mientras se resuelve la sesión guardada, al arrancar la app. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
