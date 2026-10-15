import { render, screen, userEvent } from '@testing-library/react-native'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import BlockedUsersSheet from '../ui-blocked-users-sheet/BlockedUsersSheet'

const USERS = [
  { id: '01890a5d-ac96-774b-bcce-b302099a8057', nickname: 'jieun.bori', avatarUrl: null },
  { id: '01890a5d-ac96-774b-bcce-b302099a8058', nickname: 'minsu_big3', avatarUrl: null },
]

describe('BlockedUsersSheet', () => {
  it('차단한 사용자가 없으면 빈 안내를 보여준다', async () => {
    await render(
      <BlockedUsersSheet isVisible onClose={jest.fn()} users={[]} onUnblock={jest.fn()} pendingUserId={null} />,
      { wrapper: SafeAreaTestProvider },
    )
    expect(screen.getByText('차단한 사용자가 없어요')).toBeOnTheScreen()
  })

  it('사용자별 차단 해제를 누르면 그 사용자 id를 알려준다', async () => {
    const onUnblock = jest.fn()
    const user = userEvent.setup()
    await render(
      <BlockedUsersSheet isVisible onClose={jest.fn()} users={USERS} onUnblock={onUnblock} pendingUserId={null} />,
      { wrapper: SafeAreaTestProvider },
    )

    expect(screen.getByText('jieun.bori')).toBeOnTheScreen()
    await user.press(screen.getAllByRole('button', { name: '차단 해제' })[1])

    expect(onUnblock).toHaveBeenCalledWith(USERS[1].id)
  })

  it('해제 처리 중에는 모든 해제 버튼이 비활성이다', async () => {
    await render(
      <BlockedUsersSheet
        isVisible
        onClose={jest.fn()}
        users={USERS}
        onUnblock={jest.fn()}
        pendingUserId={USERS[0].id}
      />,
      { wrapper: SafeAreaTestProvider },
    )
    screen.getAllByRole('button', { name: '차단 해제' }).forEach((button) => expect(button).toBeDisabled())
    expect(screen.getAllByRole('button', { name: '차단 해제' })[0]).toBeBusy()
  })
})
