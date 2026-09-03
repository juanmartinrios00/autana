import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Skeleton } from '../ui/Skeleton'

/** Manda a login y recuerda a dónde quería ir, para volver después. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  /* Sin esta espera, alguien con sesión válida vería un parpadeo del login
     mientras Supabase termina de leer el token guardado. */
  if (loading) {
    return (
      <div className="page section">
        <Skeleton height="320px" radius="16px" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  return <Outlet />
}
