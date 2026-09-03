import { useContext } from 'react'
import { AuthContext } from '../context/auth-context'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth necesita estar dentro de <AuthProvider>')
  return value
}
