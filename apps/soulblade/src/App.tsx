import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { LoadingScreen } from '@/ui/components/LoadingScreen'
import { router } from './Router'

export const App = () => {
  const initialize = useAuthStore((s) => s.initialize)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return <LoadingScreen message="인증 확인 중..." />
  }

  return <RouterProvider router={router} />
}
