import { render, screen, userEvent } from '@testing-library/react-native'
import WithdrawDialog from '../ui-withdraw-dialog/WithdrawDialog'

const setup = async (overrides: { isSubmitting?: boolean; errorMessage?: string | null } = {}) => {
  const onClose = jest.fn()
  const onConfirm = jest.fn()
  const view = await render(
    <WithdrawDialog
      isVisible
      onClose={onClose}
      onConfirm={onConfirm}
      isSubmitting={false}
      errorMessage={null}
      {...overrides}
    />,
  )
  return { onClose, onConfirm, view, user: userEvent.setup() }
}

describe('WithdrawDialog (2단계 확인)', () => {
  it('1단계: 지워지는 데이터를 안내하고, 다음을 눌러야 2단계로 간다', async () => {
    const { onConfirm, user } = await setup()

    expect(screen.getByRole('header', { name: '탈퇴하기 전에 확인해 주세요' })).toBeOnTheScreen()
    expect(screen.getByText(/연결된 카카오 · Google 계정 연동도 해제돼요/)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '탈퇴하기' })).not.toBeOnTheScreen()

    await user.press(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByRole('header', { name: '정말 탈퇴할까요?' })).toBeOnTheScreen()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('2단계에서 탈퇴하기를 눌러야 onConfirm이 호출된다', async () => {
    const { onConfirm, user } = await setup()
    await user.press(screen.getByRole('button', { name: '다음' }))
    await user.press(screen.getByRole('button', { name: '탈퇴하기' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('어느 단계에서든 취소하면 닫는다', async () => {
    const { onClose, user } = await setup()
    await user.press(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.press(screen.getByRole('button', { name: '다음' }))
    await user.press(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('닫았다 다시 열면 1단계부터 시작한다', async () => {
    const { view, user, onClose, onConfirm } = await setup()
    await user.press(screen.getByRole('button', { name: '다음' }))

    await view.rerender(
      <WithdrawDialog
        isVisible={false}
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={false}
        errorMessage={null}
      />,
    )
    await view.rerender(
      <WithdrawDialog isVisible onClose={onClose} onConfirm={onConfirm} isSubmitting={false} errorMessage={null} />,
    )

    expect(screen.getByRole('header', { name: '탈퇴하기 전에 확인해 주세요' })).toBeOnTheScreen()
  })

  it('처리 중이면 탈퇴하기가 busy, 실패하면 안내 문구를 보여준다', async () => {
    const { user } = await setup({ isSubmitting: true, errorMessage: '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요' })
    await user.press(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeBusy()
    expect(screen.getByText('탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
  })
})
