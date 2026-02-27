import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { GroupSetupPage } from '@/pages/group-setup/GroupSetupPage'
import { FridgeSelectPage } from '@/pages/select/FridgeSelectPage'
import { SetupPage } from '@/pages/setup/SetupPage'
import { FridgePage } from '@/pages/fridge/FridgePage'
import { AlertsPage } from '@/pages/alerts/AlertsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { RecipeSuggestPage } from '@/pages/recipes/RecipeSuggestPage'
import { RecipeDetailPage } from '@/pages/recipes/RecipeDetailPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/group-setup',
    element: <GroupSetupPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/select',
        element: <Layout />,
        children: [{ index: true, element: <FridgeSelectPage /> }],
      },
      {
        path: '/setup',
        element: <Layout />,
        children: [{ index: true, element: <SetupPage /> }],
      },
      {
        element: <Layout />,
        children: [
          { path: '/fridge', element: <FridgePage /> },
          { path: '/recipes', element: <RecipeSuggestPage /> },
          { path: '/recipes/:index', element: <RecipeDetailPage /> },
          { path: '/alerts', element: <AlertsPage /> },
        ],
      },
      {
        path: '/settings',
        element: <Layout />,
        children: [{ index: true, element: <SettingsPage /> }],
      },
    ],
  },
])
