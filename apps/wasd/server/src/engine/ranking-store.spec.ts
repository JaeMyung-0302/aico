import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RankingEntry } from '@wasd/shared'

// node:fs 모킹 — 파일 시스템 접근 차단
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => {
    throw new Error('ENOENT')
  }),
  writeFile: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const makeEntry = (
  elapsedTime: number,
  deaths = 0,
  clearedAt = 0,
  name = 'player',
): RankingEntry => ({ name, elapsedTime, deaths, clearedAt })

// 각 테스트마다 모듈을 새로 import해서 module-level 상태 초기화
const loadStore = async () => {
  vi.resetModules()
  const mod = await import('./ranking-store.js')
  return mod.rankingStore
}

describe('rankingStore.addEntry', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('첫 번째 엔트리 추가 → 1위 반환', async () => {
    const store = await loadStore()
    const rank = store.addEntry(makeEntry(100))
    expect(rank).toBe(1)
  })

  it('더 빠른 기록이 앞 순위', async () => {
    const store = await loadStore()
    store.addEntry(makeEntry(200))
    const rank = store.addEntry(makeEntry(100))
    expect(rank).toBe(1)
  })

  it('같은 시간이면 deaths 적은 쪽이 앞 순위', async () => {
    const store = await loadStore()
    store.addEntry(makeEntry(100, 2))
    const rank = store.addEntry(makeEntry(100, 0))
    expect(rank).toBe(1)
  })

  it('같은 시간+deaths면 clearedAt 빠른 쪽이 앞 순위', async () => {
    const store = await loadStore()
    store.addEntry(makeEntry(100, 0, 200))
    const rank = store.addEntry(makeEntry(100, 0, 100))
    expect(rank).toBe(1)
  })

  it('MAX_RANKING_SIZE 초과 기록은 null 반환', async () => {
    const store = await loadStore()
    // MAX_RANKING_SIZE(50)개 먼저 채우기
    for (let i = 0; i < 50; i++) {
      store.addEntry(makeEntry(i + 1))
    }
    // 가장 느린 기록 → 순위권 밖
    const rank = store.addEntry(makeEntry(9999))
    expect(rank).toBeNull()
  })

  it('MAX_RANKING_SIZE 채워도 더 빠른 기록은 등록됨', async () => {
    const store = await loadStore()
    for (let i = 1; i <= 50; i++) {
      store.addEntry(makeEntry(i * 10))
    }
    // 가장 빠른 기록 → 1위
    const rank = store.addEntry(makeEntry(1))
    expect(rank).toBe(1)
  })
})

describe('rankingStore.getRankings', () => {
  it('추가한 순서가 아닌 성적 순서로 반환', async () => {
    const store = await loadStore()
    store.addEntry(makeEntry(300, 0, 0, 'slow'))
    store.addEntry(makeEntry(100, 0, 0, 'fast'))
    store.addEntry(makeEntry(200, 0, 0, 'mid'))

    const list = store.getRankings()
    expect(list[0]?.name).toBe('fast')
    expect(list[1]?.name).toBe('mid')
    expect(list[2]?.name).toBe('slow')
  })

  it('반환값은 내부 배열의 복사본 (mutation 방어)', async () => {
    const store = await loadStore()
    store.addEntry(makeEntry(100, 0, 0, 'A'))

    const list = store.getRankings()
    list.push(makeEntry(999, 0, 0, 'INJECTED'))

    expect(store.getRankings()).toHaveLength(1)
  })
})
