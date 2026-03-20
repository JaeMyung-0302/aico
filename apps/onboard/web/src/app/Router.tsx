import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthPage } from '@/pages/auth/AuthPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { ChecklistPage } from '@/pages/checklist/ChecklistPage'
import { IntegrationsPage } from '@/pages/integrations/IntegrationsPage'
import { KnowledgeBasePage } from '@/pages/knowledge-base/KnowledgeBasePage'
import { Layout } from '@/components/Layout/Layout'
import { AuthGuard } from '@/components/AuthGuard'

export const Router = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
      </Route>
    </Routes>
  )
}
