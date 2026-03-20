import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('./ranking-store.js', () => ({
  rankingStore: {
    getRankings: vi.fn().mockReturnValue([]),
    addEntry: vi.fn().mockReturnValue(1),
  },
}))

vi.mock('../rooms/room-manager.js', () => ({
  roomManager: {
    getRoom: vi.fn().mockReturnValue({
      players: [{ nickname: 'player1' }],
    }),
  },
}))

import { GameLoop, gameLoops } from './game-loop.js'
import { GAME_LOOP_TTL_MS, MAX_INPUT_QUEUE, SocketEvents } from '@wasd/shared'
import type { InputEntry } from './game-state.js'
import type { Server } from 'socket.io'

const makeIo = () => {
  const emit = vi.fn()
  const io = { to: vi.fn().mockReturnValue({ emit }) }
  return { io: io as unknown as Server, emit }
}

const makeInput = (key: InputEntry['key'] = 'ArrowRight'): InputEntry => ({
  key,
  playerId: 'p1',
  nickname: 'player1',
})

describe('GameLoop TTL', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    gameLoops.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('TTL 경과 → GAME_COMPLETE emit (myRank: null)', () => {
    const { io, emit } = makeIo()
    const loop = new GameLoop('r-1', io)
    loop.start()

    vi.advanceTimersByTime(GAME_LOOP_TTL_MS)

    expect(emit).toHaveBeenCalledWith(
      SocketEvents.GAME_COMPLETE,
      expect.objectContaining({ myRank: null }),
    )
  })

  it('TTL 경과 → gameLoops에서 roomCode 제거', () => {
    const { io } = makeIo()
    const loop = new GameLoop('r-2', io)
    gameLoops.set('r-2', loop)
    loop.start()

    vi.advanceTimersByTime(GAME_LOOP_TTL_MS)

    expect(gameLoops.has('r-2')).toBe(false)
  })

  it('stop() 먼저 호출 → TTL 경과해도 GAME_COMPLETE 미발생', () => {
    const { io, emit } = makeIo()
    const loop = new GameLoop('r-3', io)
    loop.start()
    loop.stop()

    vi.advanceTimersByTime(GAME_LOOP_TTL_MS)

    expect(emit).not.toHaveBeenCalledWith(
      SocketEvents.GAME_COMPLETE,
      expect.anything(),
    )
  })

  it('TTL emit에 deaths와 ranking 포함', () => {
    const { io, emit } = makeIo()
    const loop = new GameLoop('r-4', io)
    loop.start()

    vi.advanceTimersByTime(GAME_LOOP_TTL_MS)

    expect(emit).toHaveBeenCalledWith(
      SocketEvents.GAME_COMPLETE,
      expect.objectContaining({
        deaths: expect.any(Number),
        elapsedTime: GAME_LOOP_TTL_MS,
        ranking: expect.any(Array),
      }),
    )
  })
})

describe('GameLoop.stop()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    gameLoops.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('start() 없이 stop() 호출해도 throw 없음', () => {
    const { io } = makeIo()
    const loop = new GameLoop('r-5', io)
    expect(() => loop.stop()).not.toThrow()
  })

  it('stop() 여러 번 호출해도 throw 없음', () => {
    const { io } = makeIo()
    const loop = new GameLoop('r-6', io)
    loop.start()
    expect(() => {
      loop.stop()
      loop.stop()
      loop.stop()
    }).not.toThrow()
  })
})

describe('GameLoop.queueInput()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    gameLoops.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('MAX_INPUT_QUEUE 이하 입력 → throw 없음', () => {
    const { io } = makeIo()
    const loop = new GameLoop('r-7', io)

    expect(() => {
      for (let i = 0; i < MAX_INPUT_QUEUE; i++) {
        loop.queueInput(makeInput())
      }
    }).not.toThrow()
  })

  it('MAX_INPUT_QUEUE 초과 입력 → throw 없음 (초과분 무시)', () => {
    const { io } = makeIo()
    const loop = new GameLoop('r-8', io)

    expect(() => {
      for (let i = 0; i <= MAX_INPUT_QUEUE + 10; i++) {
        loop.queueInput(makeInput())
      }
    }).not.toThrow()
  })
})
