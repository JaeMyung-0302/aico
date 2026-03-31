import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import AuthGuard from '@/components/AuthGuard'
import ErrorPage from '@/pages/error/ErrorPage'

const HomePage = lazy(() => import('@/pages/home/HomePage'))
const ResultPage = lazy(() => import('@/pages/result/ResultPage'))
const AuthPage = lazy(() => import('@/pages/auth/AuthPage'))
const MyPage = lazy(() => import('@/pages/mypage/MyPage'))
const NotFoundPage = lazy(() => import('@/pages/error/NotFoundPage'))
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'))
const AdminFeedbackPage = lazy(
  () => import('@/pages/admin/feedback/AdminFeedbackPage'),
)
const TermsPage = lazy(() => import('@/pages/terms/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/privacy/PrivacyPage'))

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/result/:id', element: <ResultPage /> },
      { path: '/auth', element: <AuthPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/mypage', element: <MyPage /> },
      {
        path: '/admin/feedback',
        element: (
          <AuthGuard>
            <AdminFeedbackPage />
          </AuthGuard>
        ),
      },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
