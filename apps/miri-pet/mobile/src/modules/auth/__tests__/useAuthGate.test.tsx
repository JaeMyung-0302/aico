import { act, renderHook, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { useAuthGate } from '../feature-auth-gate/useAuthGate'

// 경계만 대체: 라우터(네비게이션), /me 네트워크, 기기 저장소
let mockSegment = '(tabs)'
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useSegments: () => [mockSegment] }))
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

const renderGate = (segment: string, isNavigatorMounted = true) => {
  mockSegment = segment
  return renderHook(() => useAuthGate({ isNavigatorMounted }), { wrapper: QueryTestProvider })
}

beforeEach(() => {
  jest.clearAllMocks()
  memoryTokenStore.reset(null)
  jest.mocked(fetchMyPets).mockResolvedValue([PET])
})

describe('useAuthGate', () => {
  it('토큰이 없으면 /login으로 보낸다', async () => {
    const { result } = await renderGate('(tabs)')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'))
    expect(result.current.isSessionResolved).toBe(true)
    expect(fetchMe).not.toHaveBeenCalled()
  })

  it('토큰은 있지만 필수 동의가 없으면(hasRequiredConsents=false) /consent로 보낸다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue(ME)
    await renderGate('(tabs)')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/consent'))
  })

  it('필수 동의를 마쳤으면 로그인 화면에서 탭(/)으로 보낸다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    await renderGate('login')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'))
  })

  it('필수 동의를 마쳤고 탭에 있으면 그대로 둔다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    await renderGate('(tabs)')
    await waitFor(() => expect(fetchMe).toHaveBeenCalled())
    // 늦게 도착한 리다이렉트가 없는지 남은 비동기 작업을 비운다
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('네비게이터가 아직 마운트되지 않았으면 이동하지 않는다', async () => {
    const { result } = await renderGate('(tabs)', false)
    await waitFor(() => expect(result.current.isSessionResolved).toBe(true))
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('PHASE 2: 동의를 마쳤지만 펫이 0마리면 /onboarding/pet으로 보낸다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    jest.mocked(fetchMyPets).mockResolvedValue([])
    await renderGate('(tabs)')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding/pet'))
  })

  it('PHASE 2: 동의 전에는 펫 목록을 조회하지 않는다 (ConsentGuard 403 방지)', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue(ME)
    await renderGate('(tabs)')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/consent'))
    expect(fetchMyPets).not.toHaveBeenCalled()
  })

  it('PHASE 2: 펫 목록 조회가 실패해도 앱을 막지 않는다 (로그인 화면이면 탭으로)', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: true })
    jest.mocked(fetchMyPets).mockRejectedValue(new Error('500'))
    await renderGate('login')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'))
  })
})
