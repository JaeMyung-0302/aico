import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { LoadingScreen } from '@/ui/components/LoadingScreen'
import { router } from './Router'

export const App = () => {
  const initialize = useAuthStore((s) => s.initialize)
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)
  const loadSave = useSaveStore((s) => s.load)
  const saveLoaded = useSaveStore((s) => s.loaded)

  useEffect(() => {
    initialize()
  }, [initialize])

  // 인증 완료 후 세이브 데이터 로드
  useEffect(() => {
    if (user && !saveLoaded) {
      loadSave()
    }
  }, [user, saveLoaded, loadSave])

  if (loading) {
    return <LoadingScreen message="인증 확인 중..." />
  }

  return <RouterProvider router={router} />
}
