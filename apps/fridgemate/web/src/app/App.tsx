import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useGroupStore } from '@/stores/useGroupStore'
import { router } from './Router'

export const App = () => {
  const restoreSession = useGroupStore((s) => s.restoreSession)

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  return <RouterProvider router={router} />
}
