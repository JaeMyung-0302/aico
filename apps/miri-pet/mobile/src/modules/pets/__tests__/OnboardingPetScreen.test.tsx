import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { BackHandler } from 'react-native'
import OnboardingPetScreen from '@/app/onboarding/pet'
import { createPet, fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'

// 경계만 대체: 라우터, 펫 네트워크, 푸시 권한, 로그아웃(서버·SDK·기기 저장소를 건드리는 뮤테이션)
const mockLogout = jest.fn()
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn(), createPet: jest.fn() }))
jest.mock('@/modules/notifications/util-push-registration', () => ({
  registerPushToken: jest.fn(() => Promise.resolve('denied')),
}))
jest.mock('@/modules/auth/data-access-auth/useLogout', () => ({
  useLogout: () => ({ mutate: mockLogout, isPending: false }),
}))

const PET = {
  id: '01890a5d-ac96-774b-bcce-b302099a8058',
  name: '보리',
  species: 'DOG' as const,
  breed: null,
  birthDate: null,
  size: 'S' as const,
  avatarUrl: null,
}

type BackListener = Parameters<typeof BackHandler.addEventListener>[1]
const BACK_EVENT = { type: 'hardwareBackPress', timeStamp: 0 }
let backListeners: BackListener[] = []

const renderScreen = async () => {
  await render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <OnboardingPetScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )
  return userEvent.setup()
}

const pressHardwareBack = () => backListeners.map((listener) => listener(BACK_EVENT))

const LOGOUT_TITLE = '로그아웃할까요?'

beforeEach(() => {
  jest.clearAllMocks()
  backListeners = []
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backListeners = [...backListeners, listener]
    return {
      remove: () => {
        backListeners = backListeners.filter((item) => item !== listener)
      },
    }
  })
  jest.mocked(fetchMyPets).mockResolvedValue([])
  jest.mocked(createPet).mockResolvedValue(PET)
})

describe('OnboardingPetScreen (03 펫 만들기)', () => {
  it('헤더 뒤로 → 로그아웃 확인 창을 띄운다 (바로 로그아웃하지 않는다)', async () => {
    const user = await renderScreen()
    await user.press(screen.getByRole('button', { name: '뒤로' }))

    expect(screen.getByRole('header', { name: LOGOUT_TITLE })).toBeOnTheScreen()
    expect(screen.getByText('다른 계정으로 로그인할 수 있어요')).toBeOnTheScreen()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('확인 창에서 로그아웃을 누르면 로그아웃한다', async () => {
    const user = await renderScreen()
    await user.press(screen.getByRole('button', { name: '뒤로' }))
    await user.press(screen.getByRole('button', { name: '로그아웃' }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('확인 창에서 취소하면 닫고 로그아웃하지 않는다', async () => {
    const user = await renderScreen()
    await user.press(screen.getByRole('button', { name: '뒤로' }))
    await user.press(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('header', { name: LOGOUT_TITLE })).not.toBeOnTheScreen()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('Android 하드웨어 뒤로도 같은 확인 창을 띄우고 앱을 종료하지 않는다(true 반환)', async () => {
    await renderScreen()
    let results: (boolean | null | undefined)[] = []
    await act(async () => {
      results = pressHardwareBack()
    })

    expect(results).toContain(true)
    expect(screen.getByRole('header', { name: LOGOUT_TITLE })).toBeOnTheScreen()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('저장 후 접종 기록 추가: 탭이 열리면(펫 목록 갱신) 내 펫 탭으로 간 뒤 접종 폼을 위에 쌓는다', async () => {
    const user = await renderScreen()
    jest.mocked(fetchMyPets).mockResolvedValue([PET])
    await user.type(screen.getByLabelText('이름'), '보리')
    await user.press(screen.getByRole('button', { name: '완료하고 접종 기록 추가하기' }))

    await waitFor(() => expect(router.push).toHaveBeenCalled())
    expect(router.replace).toHaveBeenCalledWith('/pets')
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pets/[petId]/vaccinations/new',
      params: { petId: PET.id },
    })
    expect(jest.mocked(router.replace).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.push).mock.invocationCallOrder[0],
    )
  })

  it('저장 후 나중에: 내 펫 탭으로만 간다', async () => {
    const user = await renderScreen()
    jest.mocked(fetchMyPets).mockResolvedValue([PET])
    await user.type(screen.getByLabelText('이름'), '보리')
    await user.press(screen.getByRole('button', { name: '접종 기록은 나중에 할게요' }))

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/pets'))
    expect(router.push).not.toHaveBeenCalled()
  })

  it('펫 목록이 아직 갱신되지 않았으면(탭이 잠겨 있으면) 이동하지 않는다', async () => {
    const user = await renderScreen()
    await user.type(screen.getByLabelText('이름'), '보리')
    await user.press(screen.getByRole('button', { name: '접종 기록은 나중에 할게요' }))

    await waitFor(() => expect(createPet).toHaveBeenCalled())
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(router.replace).not.toHaveBeenCalled()
  })
})
