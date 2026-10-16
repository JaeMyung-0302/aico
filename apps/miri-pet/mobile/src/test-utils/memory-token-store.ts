import type { TokenPair } from '@/shared/api/token-store'

// jest.mock('@/shared/api/token-store') 팩토리에서 쓰는 메모리 저장소 (기기 보안 저장소 대체)
export const createMemoryTokenStore = (initial: TokenPair | null = null) => {
  let current = initial
  return {
    read: jest.fn(async () => current),
    save: jest.fn(async (tokens: TokenPair) => {
      current = tokens
    }),
    clear: jest.fn(async () => {
      current = null
    }),
    reset: (next: TokenPair | null) => {
      current = next
    },
  }
}

// jest.mock 팩토리(jest.requireActual)와 테스트 본문이 같은 인스턴스를 공유한다
export const sharedMemoryTokenStore = createMemoryTokenStore()
