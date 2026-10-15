import { render, screen, userEvent } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import ReportSheet, { type ReportSheetProps } from '../ui-report-sheet/ReportSheet'

const TARGET_ID = '01890a5d-ac96-774b-bcce-b302099a8057'
const AUTHOR = { id: '01890a5d-ac96-774b-bcce-b302099a8058', nickname: 'jieun.bori' }

const setup = async (overrides: Partial<ReportSheetProps> = {}) => {
  const props: ReportSheetProps = {
    isVisible: true,
    onClose: jest.fn(),
    target: { type: 'POST', id: TARGET_ID },
    author: AUTHOR,
    onSubmitReport: jest.fn(async () => undefined),
    onBlock: jest.fn(async () => undefined),
    ...overrides,
  }
  const view = await render(<ReportSheet {...props} />, { wrapper: SafeAreaTestProvider })
  return { props, view, user: userEvent.setup() }
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })

describe('ReportSheet', () => {
  it('메뉴 단계: 대상 제목과 신고·차단 항목을 보여준다', async () => {
    await setup()
    expect(screen.getByRole('header', { name: 'jieun.bori 님의 게시물' })).toBeOnTheScreen()
    expect(button('게시물 신고')).toBeOnTheScreen()
    expect(button('jieun.bori 님 차단')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '프로필 보기' })).not.toBeOnTheScreen()
  })

  it('신고 → 사유 선택 → 완료: 고른 사유로 신고하고 확인을 누르면 닫는다', async () => {
    const { props, user } = await setup()
    await user.press(button('게시물 신고'))

    expect(screen.getByRole('header', { name: '신고 사유를 골라주세요' })).toBeOnTheScreen()
    expect(screen.getByText('신고한 사실은 상대에게 알려지지 않아요.')).toBeOnTheScreen()
    ;['스팸 · 광고', '동물 학대 · 유해한 내용', '혐오 · 괴롭힘', '음란물', '개인정보 노출', '기타'].forEach((label) =>
      expect(button(label)).toBeOnTheScreen(),
    )

    await user.press(button('동물 학대 · 유해한 내용'))

    expect(props.onSubmitReport).toHaveBeenCalledWith('ANIMAL_ABUSE')
    expect(await screen.findByRole('header', { name: '접수됐어요' })).toBeOnTheScreen()

    await user.press(button('확인'))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('이미 신고한 대상(409)이면 안내하고 사유 단계에 머문다', async () => {
    const onSubmitReport = jest.fn(async () => {
      throw new ApiError({ code: 'HTTP', status: 409, message: 'duplicate' })
    })
    const { user } = await setup({ onSubmitReport })
    await user.press(button('게시물 신고'))
    await user.press(button('스팸 · 광고'))

    expect(await screen.findByText('이미 신고한 대상이에요')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: '신고 사유를 골라주세요' })).toBeOnTheScreen()
  })

  it('그 밖의 실패는 다시 시도 안내를 보여준다', async () => {
    const onSubmitReport = jest.fn(async () => {
      throw new ApiError({ code: 'NETWORK', message: 'offline' })
    })
    const { user } = await setup({ onSubmitReport })
    await user.press(button('게시물 신고'))
    await user.press(button('기타'))

    expect(await screen.findByText('신고하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
  })

  it('차단 → 확인 단계 → 취소하면 메뉴로 돌아간다', async () => {
    const { props, user } = await setup()
    await user.press(button('jieun.bori 님 차단'))

    expect(screen.getByRole('header', { name: 'jieun.bori 님을 차단할까요?' })).toBeOnTheScreen()
    expect(screen.getByText('서로 메시지를 보낼 수 없어요')).toBeOnTheScreen()

    await user.press(button('취소'))

    expect(button('게시물 신고')).toBeOnTheScreen()
    expect(props.onBlock).not.toHaveBeenCalled()
  })

  it('차단 → 차단하기 → 완료', async () => {
    const { props, user } = await setup()
    await user.press(button('jieun.bori 님 차단'))
    await user.press(button('차단하기'))

    expect(props.onBlock).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('header', { name: '차단했어요' })).toBeOnTheScreen()
  })

  it('사용자 대상이면 "사용자 신고"로 표시하고, onViewProfile이 있으면 프로필 보기를 보여준다', async () => {
    const onViewProfile = jest.fn()
    const { user } = await setup({ target: { type: 'USER', id: AUTHOR.id }, onViewProfile })

    expect(screen.getByRole('header', { name: 'jieun.bori 님' })).toBeOnTheScreen()
    expect(button('사용자 신고')).toBeOnTheScreen()
    await user.press(button('프로필 보기'))
    expect(onViewProfile).toHaveBeenCalledTimes(1)
  })

  it('닫았다가 다시 열면 메뉴 단계부터 시작한다', async () => {
    const { props, view, user } = await setup()
    await user.press(button('게시물 신고'))
    await user.press(screen.getByRole('button', { name: '닫기' }))
    expect(props.onClose).toHaveBeenCalled()

    await view.rerender(<ReportSheet {...props} isVisible={false} />)
    await view.rerender(<ReportSheet {...props} isVisible />)

    expect(button('게시물 신고')).toBeOnTheScreen()
  })
})
