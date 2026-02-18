import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { HatchPage } from '@/pages/hatch/HatchPage'
import { GamePage } from '@/pages/game/GamePage'
import { MinigamePage } from '@/pages/game/MinigamePage'
import { DungeonSelectPage } from '@/pages/dungeon/DungeonSelectPage'
import { DungeonBattlePage } from '@/pages/dungeon/DungeonBattlePage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { TutorialPage } from '@/pages/tutorial/TutorialPage'
import { SummonPage } from '@/pages/summon/SummonPage'
import { MonsterListPage } from '@/pages/monsters/MonsterListPage'
import { MonsterDetailPage } from '@/pages/monsters/MonsterDetailPage'
import { CodexPage } from '@/pages/codex/CodexPage'
import { PartyPage } from '@/pages/party/PartyPage'
import { StageListPage } from '@/pages/stage/StageListPage'
import { StageBattlePage } from '@/pages/stage/StageBattlePage'
import { EvolutionPage } from '@/pages/evolution/EvolutionPage'
import { FusionPage } from '@/pages/fusion/FusionPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/tutorial',
    element: (
      <ProtectedRoute>
        <TutorialPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/hatch',
    element: (
      <ProtectedRoute>
        <HatchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/game',
    element: (
      <ProtectedRoute>
        <Layout>
          <GamePage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/minigame',
    element: (
      <ProtectedRoute>
        <Layout>
          <MinigamePage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dungeon',
    element: (
      <ProtectedRoute>
        <Layout>
          <DungeonSelectPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dungeon/battle',
    element: (
      <ProtectedRoute>
        <DungeonBattlePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/summon',
    element: (
      <ProtectedRoute>
        <Layout>
          <SummonPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/monsters',
    element: (
      <ProtectedRoute>
        <Layout>
          <MonsterListPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/monsters/:id',
    element: (
      <ProtectedRoute>
        <Layout>
          <MonsterDetailPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/codex',
    element: (
      <ProtectedRoute>
        <Layout>
          <CodexPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/party',
    element: (
      <ProtectedRoute>
        <Layout>
          <PartyPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/stages',
    element: (
      <ProtectedRoute>
        <Layout>
          <StageListPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/evolution/:id',
    element: (
      <ProtectedRoute>
        <Layout>
          <EvolutionPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/fusion',
    element: (
      <ProtectedRoute>
        <Layout>
          <FusionPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/stages/:id/battle',
    element: (
      <ProtectedRoute>
        <StageBattlePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout>
          <GamePage />
        </Layout>
      </ProtectedRoute>
    ),
  },
])
