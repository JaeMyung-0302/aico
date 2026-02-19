import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const HomePage = lazy(() => import('@/pages/home/HomePage'))
const GamePage = lazy(() => import('@/pages/game/GamePage'))
const ResultPage = lazy(() => import('@/pages/result/ResultPage'))
const GrowthPage = lazy(() => import('@/pages/growth/GrowthPage'))
const ArchivePage = lazy(() => import('@/pages/archive/ArchivePage'))

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#888' }}>
    Loading...
  </div>
)

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/growth" element={<GrowthPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)

export default App
