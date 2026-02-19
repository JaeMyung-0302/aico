import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/global.scss'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('[ElementGuard] #root 엘리먼트를 찾을 수 없습니다.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
