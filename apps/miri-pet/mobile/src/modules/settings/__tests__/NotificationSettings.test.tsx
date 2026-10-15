import { render, screen, userEvent } from '@testing-library/react-native'
import NotificationSettings from '../ui-notification-settings/NotificationSettings'

const VALUES = { notifyVaccination: true, notifySocial: false, notifyDm: true }

describe('NotificationSettings', () => {
  it('알림 3종을 현재 값으로 보여준다', async () => {
    await render(<NotificationSettings values={VALUES} onToggle={jest.fn()} />)

    expect(screen.getByRole('switch', { name: '접종 일정' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '좋아요 · 댓글 · 팔로우' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '메시지' })).toBeChecked()
  })

  it('토글하면 해당 필드와 바뀔 값을 알려준다', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()
    await render(<NotificationSettings values={VALUES} onToggle={onToggle} />)

    await user.press(screen.getByRole('switch', { name: '좋아요 · 댓글 · 팔로우' }))
    await user.press(screen.getByRole('switch', { name: '메시지' }))

    expect(onToggle.mock.calls).toEqual([
      ['notifySocial', true],
      ['notifyDm', false],
    ])
  })
})
