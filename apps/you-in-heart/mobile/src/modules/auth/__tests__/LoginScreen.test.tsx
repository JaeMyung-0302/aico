import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { loginWithKakao } from '../data-access-auth/auth-api'
import LoginScreen from '../feature-login/LoginScreen'
import { getKakaoIdToken } from '../util-social-login/kakao'

jest.mock('../util-social-login/kakao', () => ({ getKakaoIdToken: jest.fn() }))
jest.mock('../data-access-auth/auth-api', () => ({ loginWithKakao: jest.fn() }))

const renderLogin = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <LoginScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => jest.clearAllMocks())

describe('LoginScreen (SCR-01)', () => {
  it('카카오 버튼과 약관 안내를 보여주고, 누르면 카카오 로그인을 시작한다', async () => {
    jest.mocked(getKakaoIdToken).mockResolvedValue(null)
    await renderLogin()
    expect(screen.getByText('마음속에 간직하는 우리의 기록')).toBeOnTheScreen()
    expect(screen.getByText(/에 동의하게 돼요/)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '카카오로 시작하기' }))

    await waitFor(() => expect(getKakaoIdToken).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('실패하면 "로그인하지 못했어요" 안내와 다시 시도 버튼으로 바뀐다', async () => {
    jest.mocked(getKakaoIdToken).mockResolvedValue('id-token')
    jest.mocked(loginWithKakao).mockRejectedValue(new ApiError({ code: 'NETWORK', message: 'x' }))
    await renderLogin()

    await fireEvent.press(screen.getByRole('button', { name: '카카오로 시작하기' }))

    expect(await screen.findByText('로그인하지 못했어요')).toBeOnTheScreen()
    expect(screen.getByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '카카오로 다시 시도' })).toBeOnTheScreen()
    expect(screen.getByText('카카오톡이 없으면 카카오 계정 웹 로그인으로 이어져요')).toBeOnTheScreen()
  })
})
