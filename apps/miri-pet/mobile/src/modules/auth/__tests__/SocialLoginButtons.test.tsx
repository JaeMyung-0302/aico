import { render, screen, userEvent } from '@testing-library/react-native'
import SocialLoginButtons from '../ui-social-login-buttons/SocialLoginButtons'

describe('SocialLoginButtons', () => {
  it('카카오·Google 버튼만 보여준다 (Apple 없음)', async () => {
    await render(<SocialLoginButtons pendingProvider={null} onSelectProvider={jest.fn()} />)

    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeOnTheScreen()
  })

  it('누른 제공자를 알려준다', async () => {
    const onSelectProvider = jest.fn()
    const user = userEvent.setup()
    await render(<SocialLoginButtons pendingProvider={null} onSelectProvider={onSelectProvider} />)

    await user.press(screen.getByRole('button', { name: '카카오로 시작하기' }))
    await user.press(screen.getByRole('button', { name: 'Google로 계속하기' }))

    expect(onSelectProvider.mock.calls).toEqual([['KAKAO'], ['GOOGLE']])
  })

  it('로그인 진행 중에는 진행 중인 버튼이 busy이고 모든 버튼이 비활성이다', async () => {
    await render(<SocialLoginButtons pendingProvider="KAKAO" onSelectProvider={jest.fn()} />)

    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeBusy()
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeDisabled()
  })
})
