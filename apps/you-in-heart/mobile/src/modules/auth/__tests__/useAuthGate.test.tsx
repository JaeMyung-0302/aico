import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { MeResponse } from '@you-in-heart/shared'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { useAuthGate } from '../feature-auth-gate/useAuthGate'

// 경계만 대체: /me 네트워크, 기기 저장소
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').sharedMemoryTokenStore,
}))

const COUPLE = {
  id: '01890a5d-ac96-774b-bcce-b302099a8001',
  status: 'ACTIVE' as const,
  startedOn: '2025-09-10',
  purgeAfter: null,
}
const ME: MeResponse = {
  id: '01890a5d-ac96-774b-bcce-b302099a8057',
  displayName: '재명',
  consents: { terms: true, privacy: true, location: false },
  couple: COUPLE,
}
const TOKENS = { accessToken: 'a', refreshToken: 'r' }

const renderGate = () => renderHook(() => useAuthGate(), { wrapper: QueryTestProvider })

beforeEach(async () => {
  jest.clearAllMocks()
  memoryTokenStore.reset(null)
  await session.bootstrap()
})

describe('useAuthGate', () => {
  it('토큰이 없으면 /login — /me를 조회하지 않는다', async () => {
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe('/login'))
    expect(fetchMe).not.toHaveBeenCalled()
  })

  it.each<[string, MeResponse, string]>([
    ['이름 없음', { ...ME, displayName: null, couple: null }, '/onboarding/profile'],
    ['미연결', { ...ME, couple: null }, '/pairing'],
    ['ACTIVE', ME, '/(tabs)'],
  ])('%s → %s', async (_, me, destination) => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue(me)
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe(destination))
    expect(result.current.isUnlinking).toBe(false)
  })

  it('UNLINKING 이면 탭으로 보내고 배너 표시(isUnlinking)를 켠다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: { ...COUPLE, status: 'UNLINKING' } })
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe('/(tabs)'))
    expect(result.current.isUnlinking).toBe(true)
  })

  it('/me 조회가 실패해도(오프라인 콜드 스타트) 스플래시에 갇히지 않는다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockRejectedValue(new Error('Network Error'))
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe('/(tabs)'))
  })

  it('로그인 직후 /me 조회 중에는 직전 값(/login)을 유지한다 — 화면이 비지 않게', async () => {
    let resolveMe: (me: MeResponse) => void = () => undefined
    jest.mocked(fetchMe).mockImplementation(() => new Promise((resolve) => (resolveMe = resolve)))
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe('/login'))

    await act(() => session.signIn(TOKENS))
    await waitFor(() => expect(fetchMe).toHaveBeenCalled())
    expect(result.current.destination).toBe('/login')

    await act(async () => resolveMe(ME))
    await waitFor(() => expect(result.current.destination).toBe('/(tabs)'))
  })

  it('로그아웃하면 /login 으로 바뀐다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue(ME)
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.destination).toBe('/(tabs)'))
    await act(() => session.endSession())
    await waitFor(() => expect(result.current.destination).toBe('/login'))
  })
})
