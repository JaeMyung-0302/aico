import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { router } from './Router'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5분
    },
  },
})

const isPrerendering =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.includes('HeadlessChrome')

const App = () => {
  const { initialize, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isPrerendering) {
      initialize()
    }
  }, [initialize])

  if (isLoading && !isPrerendering) {
    return <Loading fullPage />
  }

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
