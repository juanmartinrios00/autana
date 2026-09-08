import { useContext } from 'react'
import { CompareContext } from '../context/compare-context'

export function useCompare() {
  const value = useContext(CompareContext)
  if (!value) throw new Error('useCompare necesita estar dentro de <CompareProvider>')
  return value
}
