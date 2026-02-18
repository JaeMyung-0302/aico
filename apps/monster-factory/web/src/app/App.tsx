import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './Router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { useUserStore } from '@/stores/useUserStore'
import { api } from '@/lib/api'

const App = () => {
  const { initialize, user } = useAuthStore()
  const { fetchMonsters } = useMonsterStore()
  const { fetchUser } = useUserStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user) {
      api.get('/auth/me').then(() => {
        fetchMonsters()
        fetchUser()
      }).catch(() => {
        // 세션 만료 시 무시 (ProtectedRoute에서 리다이렉트 처리)
      })
    }
  }, [user, fetchMonsters, fetchUser])

  return <RouterProvider router={router} />
}

export default App
