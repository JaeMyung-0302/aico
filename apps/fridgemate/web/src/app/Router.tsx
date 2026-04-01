import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'

const LoginPage = lazy(() =>
  import('@/pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/register/RegisterPage').then((m) => ({
    default: m.RegisterPage,
  })),
)
const GroupSetupPage = lazy(() =>
  import('@/pages/group-setup/GroupSetupPage').then((m) => ({
    default: m.GroupSetupPage,
  })),
)
const FridgeSelectPage = lazy(() =>
  import('@/pages/select/FridgeSelectPage').then((m) => ({
    default: m.FridgeSelectPage,
  })),
)
const SetupPage = lazy(() =>
  import('@/pages/setup/SetupPage').then((m) => ({ default: m.SetupPage })),
)
const FridgePage = lazy(() =>
  import('@/pages/fridge/FridgePage').then((m) => ({ default: m.FridgePage })),
)
const AlertsPage = lazy(() =>
  import('@/pages/alerts/AlertsPage').then((m) => ({
    default: m.AlertsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
)
const RecipeSuggestPage = lazy(() =>
  import('@/pages/recipes/RecipeSuggestPage').then((m) => ({
    default: m.RecipeSuggestPage,
  })),
)
const RecipeDetailPage = lazy(() =>
  import('@/pages/recipes/RecipeDetailPage').then((m) => ({
    default: m.RecipeDetailPage,
  })),
)
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
