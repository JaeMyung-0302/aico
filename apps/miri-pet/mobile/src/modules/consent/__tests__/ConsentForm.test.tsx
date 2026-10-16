import { render, screen, userEvent } from '@testing-library/react-native'
import ConsentForm from '../ui-consent-form/ConsentForm'

const REQUIRED_LABELS = [
  '[필수] 만 14세 이상입니다',
  '[필수] 서비스 이용약관',
  '[필수] 개인정보 수집·이용',
  '[필수] 커뮤니티 이용 수칙',
]

const setup = async () => {
  const onSubmit = jest.fn()
  const onOpenDocument = jest.fn()
  await render(<ConsentForm onSubmit={onSubmit} onOpenDocument={onOpenDocument} />)
  return { onSubmit, onOpenDocument, user: userEvent.setup() }
}

const submitButton = () => screen.getByRole('button', { name: '동의하고 계속' })
const checkbox = (name: string) => screen.getByRole('checkbox', { name })

describe('ConsentForm', () => {
  it('처음에는 아무것도 체크되지 않고 제출 버튼이 비활성이다', async () => {
    await setup()
    REQUIRED_LABELS.forEach((label) => expect(checkbox(label)).not.toBeChecked())
    expect(submitButton()).toBeDisabled()
  })

  it('필수 항목 중 하나라도 빠지면 제출 버튼이 비활성이다', async () => {
    const { user } = await setup()
    for (const label of REQUIRED_LABELS.slice(0, 3)) await user.press(checkbox(label))
    await user.press(checkbox('[선택] 위치기반서비스 이용약관'))

    expect(submitButton()).toBeDisabled()
  })

  it('필수 항목을 모두 체크하면 제출할 수 있고, 선택 항목은 false로 전달된다', async () => {
    const { user, onSubmit } = await setup()
    for (const label of REQUIRED_LABELS) await user.press(checkbox(label))

    expect(submitButton()).toBeEnabled()
    await user.press(submitButton())

    expect(onSubmit).toHaveBeenCalledWith({
      isAge14OrOlder: true,
      terms: true,
      privacy: true,
      community: true,
      location: false,
      marketing: false,
    })
  })

  it('전체 동의는 모든 항목을 체크하고, 다시 누르면 모두 해제한다', async () => {
    const { user } = await setup()
    await user.press(checkbox('전체 동의'))

    expect(checkbox('[선택] 이벤트·혜택 알림 수신')).toBeChecked()
    expect(checkbox('전체 동의')).toBeChecked()
    expect(submitButton()).toBeEnabled()

    await user.press(checkbox('전체 동의'))

    expect(checkbox('[필수] 서비스 이용약관')).not.toBeChecked()
    expect(submitButton()).toBeDisabled()
  })

  it('개별 항목을 모두 체크하면 전체 동의도 체크 상태가 된다', async () => {
    const { user } = await setup()
    for (const label of [...REQUIRED_LABELS, '[선택] 위치기반서비스 이용약관', '[선택] 이벤트·혜택 알림 수신']) {
      await user.press(checkbox(label))
    }
    expect(checkbox('전체 동의')).toBeChecked()
  })

  it('보기 링크는 해당 약관 문서를 연다', async () => {
    const { user, onOpenDocument } = await setup()
    await user.press(screen.getByRole('link', { name: '서비스 이용약관 보기' }))
    await user.press(screen.getByRole('link', { name: '위치기반서비스 이용약관 보기' }))
    expect(onOpenDocument.mock.calls).toEqual([['terms'], ['location']])
  })

  it('제출 중이면 버튼이 비활성(busy)이다', async () => {
    const onSubmit = jest.fn()
    await render(<ConsentForm onSubmit={onSubmit} onOpenDocument={jest.fn()} isSubmitting />)
    expect(submitButton()).toBeBusy()
  })
})
