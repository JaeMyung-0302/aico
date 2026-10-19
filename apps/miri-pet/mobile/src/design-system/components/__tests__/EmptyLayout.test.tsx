import { render, screen, userEvent } from '@testing-library/react-native'
import EmptyLayout from '../EmptyLayout'

describe('EmptyLayout', () => {
  it('onRetry가 있으면 "다시 시도" 버튼을 보여주고 누르면 부른다', async () => {
    const onRetry = jest.fn()
    const user = userEvent.setup()
    await render(<EmptyLayout title="불러오지 못했어요" onRetry={onRetry} />)
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('onRetry가 없으면 버튼이 없다', async () => {
    await render(<EmptyLayout title="아직 없어요" description="설명" />)
    expect(screen.getByText('설명')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
  })
})
