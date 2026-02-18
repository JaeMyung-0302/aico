import { Navigate, Outlet } from 'react-router-dom'
import { useGroupStore } from '@/stores/useGroupStore'

export const GroupGuard = () => {
  const isAuthenticated = useGroupStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
