import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import AuthGuard from '@/components/AuthGuard'
import HomePage from '@/pages/home/HomePage'
import ResultPage from '@/pages/result/ResultPage'
import AuthPage from '@/pages/auth/AuthPage'
import MyPage from '@/pages/mypage/MyPage'
import ErrorPage from '@/pages/error/ErrorPage'
import NotFoundPage from '@/pages/error/NotFoundPage'
import AdminFeedbackPage from '@/pages/admin/feedback/AdminFeedbackPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/result/:id', element: <ResultPage /> },
      { path: '/auth', element: <AuthPage /> },
      { path: '/mypage', element: <MyPage /> },
      {
        path: '/admin/feedback',
        element: (
          <AuthGuard>
            <AdminFeedbackPage />
          </AuthGuard>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
