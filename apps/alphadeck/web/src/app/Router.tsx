import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout/Layout';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import HomePage from '@/pages/home/HomePage';
import AnalysisPage from '@/pages/analysis/AnalysisPage';
import AuthPage from '@/pages/auth/AuthPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import BriefingPage from '@/pages/briefing/BriefingPage';
import BriefingDetailPage from '@/pages/briefing/BriefingDetailPage';
import PortfolioPage from '@/pages/portfolio/PortfolioPage';
import MyPage from '@/pages/mypage/MyPage';
import SignalsPage from '@/pages/signals/SignalsPage';
import AlertSettingsPage from '@/pages/signals/AlertSettingsPage';
import TradeLogPage from '@/pages/trade-review/TradeLogPage';
import ReviewReportPage from '@/pages/trade-review/ReviewReportPage';
import BacktestPage from '@/pages/backtest/BacktestPage';
import NotFoundPage from '@/pages/error/NotFoundPage';
import ErrorPage from '@/pages/error/ErrorPage';

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
