import { createContext } from 'react'
import type { Session } from '../lib/auth'
import type { SellerType } from '../types'

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
  /** `sellerType` se elige en el registro y define el tope de avisos vivos. */
  signUp: (
    email: string,
    password: string,
    name: string,
    sellerType: SellerType,
  ) => Promise<void>
  /** Sólo entra a una cuenta que ya existe: registrarse es con contraseña. */
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
