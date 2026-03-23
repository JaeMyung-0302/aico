import { useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

interface AuthGuardProps {
  children: ReactNode
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, tenant, isLoading, initialize } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate('/auth')
      return
    }
    if (!tenant && location.pathname !== '/team-setup') {
      navigate('/team-setup')
    }
  }, [isLoading, user, tenant, navigate, location.pathname])

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>로딩 중...</div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
