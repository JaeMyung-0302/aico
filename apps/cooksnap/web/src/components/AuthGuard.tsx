import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'

interface AuthGuardProps {
  children: React.ReactNode
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <Loading message="인증 확인 중..." />
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default AuthGuard
