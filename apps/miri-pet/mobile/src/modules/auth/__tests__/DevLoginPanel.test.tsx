import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { session } from '@/shared/auth/session'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { devLogin } from '../feature-dev-login/dev-login-api'
import DevLoginPanel from '../feature-dev-login/DevLoginPanel'
import { isDevLoginEnabled } from '../feature-dev-login/is-dev-login-enabled'

jest.mock('../feature-dev-login/dev-login-api', () => ({ devLogin: jest.fn() }))
jest.mock('@/shared/auth/session', () => ({ session: { signIn: jest.fn() } }))

const TOKENS = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900, isNewUser: true }

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
    expect(isDevLoginEnabled(true, 'TRUE')).toBe(false)
  })
})

describe('DevLoginPanel', () => {
  const renderPanel = () =>
    render(
      <QueryTestProvider>
        <DevLoginPanel />
      </QueryTestProvider>,
    )

  it('닉네임으로 POST /auth/dev 후 세션을 시작한다 (이후 이동은 인증 게이트)', async () => {
    const user = userEvent.setup()
    await renderPanel()
    await user.clear(screen.getByLabelText('개발용 닉네임'))
    await user.type(screen.getByLabelText('개발용 닉네임'), '테스터')
    await user.press(screen.getByRole('button', { name: '개발용 로그인' }))

    await waitFor(() => expect(session.signIn).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' }))
    expect(devLogin).toHaveBeenCalledWith({ nickname: '테스터' })
  })

  it('닉네임이 2자 미만이면 버튼이 비활성', async () => {
    const user = userEvent.setup()
    await renderPanel()
    await user.clear(screen.getByLabelText('개발용 닉네임'))
    await user.type(screen.getByLabelText('개발용 닉네임'), 'a')
    expect(screen.getByRole('button', { name: '개발용 로그인' })).toBeDisabled()
  })

  it('실패하면 안내 문구를 보여준다 (서버에서 ENABLE_DEV_LOGIN 꺼짐 = 404)', async () => {
    jest.mocked(devLogin).mockRejectedValue(new Error('404'))
    const user = userEvent.setup()
    await renderPanel()
    await user.press(screen.getByRole('button', { name: '개발용 로그인' }))
    expect(await screen.findByText('개발용 로그인 실패 — 서버 ENABLE_DEV_LOGIN을 확인하세요')).toBeOnTheScreen()
  })
})
