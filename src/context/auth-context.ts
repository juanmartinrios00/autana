import { createContext } from 'react'
import type { Session } from '../lib/auth'

export interface AuthValue {
  session: Session | null
  /** `true` mientras se resuelve la sesión guardada, al arrancar la app. */
  loading: boolean
  /**
   * `true` cuando la sesión abierta vino de un link de recuperación. Es lo
   * único que autoriza a cambiar la contraseña sin saber la actual: sin esta
   * marca, cualquiera con una sesión abierta podría hacerlo.
   */
  recovering: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
