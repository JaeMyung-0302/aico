import { createBrowserRouter } from 'react-router-dom'
import { LobbyPage } from '@/ui/pages/LobbyPage'
import { GamePage } from '@/ui/pages/GamePage'
import { ResultPage } from '@/ui/pages/ResultPage'
import { InventoryPage } from '@/ui/pages/InventoryPage'
import { MetaUpgradePage } from '@/ui/pages/MetaUpgradePage'
import { SkillTreePage } from '@/ui/pages/SkillTreePage'
import { DailyPage } from '@/ui/pages/DailyPage'
import { ChallengePage } from '@/ui/pages/ChallengePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LobbyPage />,
  },
  {
    path: '/game',
    element: <GamePage />,
  },
  {
    path: '/result',
    element: <ResultPage />,
  },
  {
    path: '/inventory',
    element: <InventoryPage />,
  },
  {
    path: '/upgrade',
    element: <MetaUpgradePage />,
  },
  {
    path: '/skill-tree',
    element: <SkillTreePage />,
  },
  {
    path: '/daily',
    element: <DailyPage />,
  },
  {
    path: '/challenge',
    element: <ChallengePage />,
  },
])
