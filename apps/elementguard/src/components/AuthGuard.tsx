import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: ReactNode
}

// 미인증 시 자동으로 게스트 로그인
export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, signInAsGuest } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      signInAsGuest()
    }
  }, [isLoading, isAuthenticated, signInAsGuest])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#888' }}>
        Loading...
      </div>
    )
  }

  return <>{children}</>
}
