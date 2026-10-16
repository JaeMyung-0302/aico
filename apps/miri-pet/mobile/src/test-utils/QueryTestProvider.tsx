import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// 관찰자 알림을 setTimeout(0) 대신 즉시 보낸다 → act() 밖 업데이트 경고 없이 결정적으로 동작
notifyManager.setScheduler((callback) => callback())

// gcTime: Infinity → 캐시 정리 타이머를 만들지 않아 jest가 바로 종료된다
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

export const QueryTestProvider = ({ children, client }: { children: ReactNode; client?: QueryClient }) => (
  <QueryClientProvider client={client ?? createTestQueryClient()}>{children}</QueryClientProvider>
)
