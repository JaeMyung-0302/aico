import { act, renderHook, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { useAuthGate } from '../feature-auth-gate/useAuthGate'

// 경계만 대체: 라우터(네비게이션), /me·펫 네트워크, 기기 저장소
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), dismissAll: jest.fn(), push: jest.fn() } }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn() }))
jest.mock('@/modules/notifications/util-push-registration', () => ({
  registerPushToken: jest.fn(() => Promise.resolve('denied')),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').sharedMemoryTokenStore,
}))

const ME = {
  id: '01890a5d-ac96-774b-bcce-b302099a8057',
  nickname: 'bori',
  avatarUrl: null,
  bio: null,
  role: 'USER' as const,
  notifyVaccination: true,
  notifySocial: true,
  notifyDm: true,
  hasRequiredConsents: false,
}

const PET = {
  id: '01890a5d-ac96-774b-bcce-b302099a8058',
  name: '보리',
  species: 'DOG' as const,
  breed: null,
  birthDate: null,
  size: 'S' as const,
  avatarUrl: null,
}

const TOKENS = { accessToken: 'a', refreshToken: 'r' }

const renderGate = () => renderHook(() => useAuthGate(), { wrapper: QueryTestProvider })

beforeEach(() => {
  jest.clearAllMocks()
  memoryTokenStore.reset(null)
  jest.mocked(fetchMyPets).mockResolvedValue([PET])
})

describe('useAuthGate', () => {
  it('토큰이 없으면 signedOut — /me를 조회하지 않는다', async () => {
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('signedOut'))
    expect(fetchMe).not.toHaveBeenCalled()
  })

  it('필수 동의가 없으면(hasRequiredConsents=false) consentRequired — 펫 목록은 조회하지 않는다 (ConsentGuard 403 방지)', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue(ME)
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('consentRequired'))
    expect(fetchMyPets).not.toHaveBeenCalled()
  })

  it('동의를 마쳤지만 펫이 0마리면 petless', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    jest.mocked(fetchMyPets).mockResolvedValue([])
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('petless'))
  })

  it('동의를 마쳤고 펫이 있으면 allowed', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('allowed'))
  })

  it('펫 목록 조회가 실패해도 앱을 막지 않는다 (allowed)', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    jest.mocked(fetchMyPets).mockRejectedValue(new Error('500'))
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('allowed'))
  })

  it('/me 조회가 실패해도(오프라인 콜드 스타트) 스플래시에 갇히지 않는다 — 동의는 서버 ConsentGuard가 다시 확인한다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockRejectedValue(new Error('Network Error'))
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('allowed'))
  })

  it('로그인 직후 /me 조회 중에는 직전 단계(signedOut)를 유지한다 — 화면이 비지 않게', async () => {
    let resolveMe: (me: typeof ME) => void = () => undefined
    jest.mocked(fetchMe).mockImplementation(() => new Promise((resolve) => (resolveMe = resolve)))
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('signedOut'))

    await act(() => session.signIn(TOKENS))
    await waitFor(() => expect(fetchMe).toHaveBeenCalled())
    expect(result.current.accessLevel).toBe('signedOut')

    await act(async () => resolveMe({ ...ME, hasRequiredConsents: true }))
    await waitFor(() => expect(result.current.accessLevel).toBe('allowed'))
  })

  it('화면 이동은 Stack.Protected가 맡는다 — 게이트는 router.replace로 화면을 바꾸지 않는다 (계정 전환 잔상 방지)', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue(ME)
    const { result } = await renderGate()
    await waitFor(() => expect(result.current.accessLevel).toBe('consentRequired'))
    await act(() => session.endSession())
    await waitFor(() => expect(result.current.accessLevel).toBe('signedOut'))
    expect(router.replace).not.toHaveBeenCalled()
  })
})
