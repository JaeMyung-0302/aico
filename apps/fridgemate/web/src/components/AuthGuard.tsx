import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

export const AuthGuard = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const needsGroup = useAuthStore((s) => s.needsGroup)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (needsGroup) {
    return <Navigate to="/group-setup" replace />
  }

  return <Outlet />
}
