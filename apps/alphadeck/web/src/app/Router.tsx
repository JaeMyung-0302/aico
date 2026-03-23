import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import Layout from '@/components/Layout/Layout';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import HomePage from '@/pages/home/HomePage';
import AuthPage from '@/pages/auth/AuthPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import NotFoundPage from '@/pages/error/NotFoundPage';
import ErrorPage from '@/pages/error/ErrorPage';

// Lazy load heavy pages (chart, backtest, etc.)
const AnalysisPage = lazy(() => import('@/pages/analysis/AnalysisPage'));
const BriefingPage = lazy(() => import('@/pages/briefing/BriefingPage'));
const BriefingDetailPage = lazy(() => import('@/pages/briefing/BriefingDetailPage'));
const PortfolioPage = lazy(() => import('@/pages/portfolio/PortfolioPage'));
const MyPage = lazy(() => import('@/pages/mypage/MyPage'));
const SignalsPage = lazy(() => import('@/pages/signals/SignalsPage'));
const AlertSettingsPage = lazy(() => import('@/pages/signals/AlertSettingsPage'));
const TradeLogPage = lazy(() => import('@/pages/trade-review/TradeLogPage'));
const ReviewReportPage = lazy(() => import('@/pages/trade-review/ReviewReportPage'));
const BacktestPage = lazy(() => import('@/pages/backtest/BacktestPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'analysis/:symbol', element: <AnalysisPage /> },
      { path: 'auth', element: <AuthPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      {
        path: 'portfolio',
        element: <AuthGuard><PortfolioPage /></AuthGuard>,
      },
      {
        path: 'briefing',
        element: <AuthGuard><BriefingPage /></AuthGuard>,
      },
      {
        path: 'briefing/:id',
        element: <AuthGuard><BriefingDetailPage /></AuthGuard>,
      },
      {
        path: 'signals',
        element: <AuthGuard><SignalsPage /></AuthGuard>,
      },
      {
        path: 'signals/settings',
        element: <AuthGuard><AlertSettingsPage /></AuthGuard>,
      },
      {
        path: 'trades',
        element: <AuthGuard><TradeLogPage /></AuthGuard>,
      },
      {
        path: 'trades/review',
        element: <AuthGuard><ReviewReportPage /></AuthGuard>,
      },
      {
        path: 'backtest',
        element: <AuthGuard><BacktestPage /></AuthGuard>,
      },
      {
        path: 'mypage',
        element: <AuthGuard><MyPage /></AuthGuard>,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default router;
