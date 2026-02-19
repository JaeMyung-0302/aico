import { RouterProvider } from 'react-router-dom'
import { InstallBanner } from '@/components/InstallBanner'
import { router } from './Router'

export const App = () => {
  return (
    <>
      <RouterProvider router={router} />
      <InstallBanner />
    </>
  )
}
