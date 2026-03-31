import { RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { InstallBanner } from '@/components/InstallBanner'
import { router } from './Router'

export const App = () => {
  return (
    <HelmetProvider>
      <RouterProvider router={router} />
      <InstallBanner />
    </HelmetProvider>
  )
}
