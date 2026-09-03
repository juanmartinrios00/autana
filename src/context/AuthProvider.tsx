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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    /* La sesión guardada se resuelve de forma asíncrona. Hasta que llegue no
       sabemos si hay usuario, y el guard de rutas tiene que esperar en vez de
       mandar a login a alguien que ya estaba adentro. */
    void getSession().then((found) => {
      setSession(found)
      setLoading(false)
    })

    return onAuthChange(setSession)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithPassword(email, password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    await signUpWithPassword(email, password, name)
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    await signInWithMagicLink(email)
  }, [])

  const signOut = useCallback(async () => {
    await endSession()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ session, loading, signIn, signUp, sendMagicLink, signOut }),
    [session, loading, signIn, signUp, sendMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
