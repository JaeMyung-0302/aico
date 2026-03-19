import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGenerateCode } = vi.hoisted(() => ({
  mockGenerateCode: vi.fn<() => string>(),
}))

vi.mock('../guards/rate-limiter.js', () => ({
  generateSecureCode: mockGenerateCode,
}))

// 각 테스트마다 module-level rooms Map 초기화
const loadManager = async () => {
  vi.resetModules()
  const mod = await import('./room-manager.js')
  return mod.roomManager
}

beforeEach(() => {
  vi.resetModules()
  mockGenerateCode.mockReset()
})

describe('roomManager.createRoom()', () => {
  it('방 생성 성공 → room 반환, host.isHost = true', async () => {
    mockGenerateCode.mockReturnValue('AAAA')
    const rm = await loadManager()
    const room = rm.createRoom('host-1', 'HostPlayer')

    expect(room).not.toBeNull()
    expect(room?.code).toBe('AAAA')
    expect(room?.players[0]?.isHost).toBe(true)
    expect(room?.hostId).toBe('host-1')
  })

  it('생성된 방 getRoom()으로 조회 가능', async () => {
    mockGenerateCode.mockReturnValue('BBBB')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')

    expect(rm.getRoom('BBBB')).toBeDefined()
  })
})

describe('roomManager.joinRoom()', () => {
  it('참가 성공 → players 2명', async () => {
    mockGenerateCode.mockReturnValue('CCCC')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')
    const joined = rm.joinRoom('CCCC', 'guest-1', 'Guest')

    expect(joined?.players).toHaveLength(2)
    expect(joined?.players[1]?.isHost).toBe(false)
  })

  it('존재하지 않는 코드 → null', async () => {
    const rm = await loadManager()
    expect(rm.joinRoom('ZZZZ', 'p1', 'Player')).toBeNull()
  })

  it('이미 같은 playerId 존재 → null', async () => {
    mockGenerateCode.mockReturnValue('DDDD')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')
    expect(rm.joinRoom('DDDD', 'host-1', 'Host')).toBeNull()
  })
})

describe('roomManager.leaveRoom()', () => {
  it('마지막 플레이어 퇴장 → 방 삭제', async () => {
    mockGenerateCode.mockReturnValue('EEEE')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')
    rm.leaveRoom('EEEE', 'host-1')

    expect(rm.getRoom('EEEE')).toBeUndefined()
  })

  it('호스트 퇴장 → 남은 플레이어가 호스트로 승격', async () => {
    mockGenerateCode.mockReturnValue('FFFF')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')
    rm.joinRoom('FFFF', 'guest-1', 'Guest')
    const updated = rm.leaveRoom('FFFF', 'host-1')

    expect(updated?.hostId).toBe('guest-1')
    expect(updated?.players[0]?.isHost).toBe(true)
  })

  it('존재하지 않는 방 → null', async () => {
    const rm = await loadManager()
    expect(rm.leaveRoom('XXXX', 'p1')).toBeNull()
  })
})

describe('roomManager.getRoomByPlayerId()', () => {
  it('해당 playerId가 속한 방 반환', async () => {
    mockGenerateCode.mockReturnValue('GGGG')
    const rm = await loadManager()
    rm.createRoom('host-1', 'Host')
    const found = rm.getRoomByPlayerId('host-1')

    expect(found?.code).toBe('GGGG')
  })

  it('없는 playerId → undefined', async () => {
    const rm = await loadManager()
    expect(rm.getRoomByPlayerId('nonexistent')).toBeUndefined()
  })
})
