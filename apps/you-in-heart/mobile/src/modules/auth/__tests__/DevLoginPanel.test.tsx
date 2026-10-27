import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { session } from '@/shared/auth/session'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { devLogin } from '../feature-dev-login/dev-login-api'
import DevLoginPanel from '../feature-dev-login/DevLoginPanel'
import { isDevLoginEnabled } from '../feature-dev-login/is-dev-login-enabled'

jest.mock('../feature-dev-login/dev-login-api', () => ({ devLogin: jest.fn() }))
jest.mock('@/shared/auth/session', () => ({ session: { signIn: jest.fn() } }))

const TOKENS = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900, isNewUser: true }

const renderPanel = () =>
  render(
    <QueryTestProvider>
      <DevLoginPanel />
    </QueryTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(devLogin).mockResolvedValue(TOKENS)
  jest.mocked(session.signIn).mockResolvedValue(undefined)
})

describe('isDevLoginEnabled', () => {
  it('개발 빌드 + EXPO_PUBLIC_ENABLE_DEV_LOGIN=true일 때만 켠다', () => {
    expect(isDevLoginEnabled(true, 'true')).toBe(true)
    expect(isDevLoginEnabled(false, 'true')).toBe(false)
    expect(isDevLoginEnabled(true, undefined)).toBe(false)
  })
})

describe('DevLoginPanel', () => {
  it('devKey 로 POST /auth/dev-login 후 세션을 시작한다', async () => {
    await renderPanel()
    await fireEvent.changeText(screen.getByLabelText('개발용 계정 키'), 'dev-b')
    await fireEvent.press(screen.getByRole('button', { name: '개발용 로그인' }))
    await waitFor(() => expect(session.signIn).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' }))
    expect(devLogin).toHaveBeenCalledWith({ devKey: 'dev-b' })
  })

  it('devKey 형식(소문자·숫자·-_)이 아니면 버튼이 비활성', async () => {
    await renderPanel()
    await fireEvent.changeText(screen.getByLabelText('개발용 계정 키'), 'Dev A')
    expect(screen.getByRole('button', { name: '개발용 로그인' })).toBeDisabled()
  })

  it('실패하면 서버 설정 안내를 보여준다', async () => {
    jest.mocked(devLogin).mockRejectedValue(new Error('404'))
    await renderPanel()
    await fireEvent.press(screen.getByRole('button', { name: '개발용 로그인' }))
    expect(await screen.findByText('개발용 로그인 실패 — 서버 DEV_LOGIN_ENABLED를 확인하세요')).toBeOnTheScreen()
  })
})
