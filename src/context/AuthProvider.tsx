import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getSession,
  onAuthChange,
  signInWithMagicLink,
  signInWithPassword,
  signOut as endSession,
  signUpWithPassword,
} from '../lib/auth'
import type { Session } from '../lib/auth'
import { AuthContext, type AuthValue } from './auth-context'
import type { SellerType } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    /* La sesión guardada se resuelve de forma asíncrona. Hasta que llegue no
       sabemos si hay usuario, y el guard de rutas tiene que esperar en vez de
       mandar a login a alguien que ya estaba adentro. */
    void getSession().then((found) => {
      setSession(found)
      setLoading(false)
    })

    return onAuthChange((found, event) => {
      setSession(found)
      /* La marca se prende con el evento de recuperación y se apaga al cerrar
         sesión. No se apaga sola al navegar: quien llegó por el link tiene que
         poder ir y volver de la pantalla sin perder el permiso. */
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
    })
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithPassword(email, password)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name: string, sellerType: SellerType) => {
      await signUpWithPassword(email, password, name, sellerType)
    },
    [],
  )

  const sendMagicLink = useCallback(
    async (email: string, profile?: { name?: string; sellerType?: SellerType }) => {
      await signInWithMagicLink(email, profile)
    },
    [],
  )

  const signOut = useCallback(async () => {
    setRecovering(false)
    await endSession()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ session, loading, recovering, signIn, signUp, sendMagicLink, signOut }),
    [session, loading, recovering, signIn, signUp, sendMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
