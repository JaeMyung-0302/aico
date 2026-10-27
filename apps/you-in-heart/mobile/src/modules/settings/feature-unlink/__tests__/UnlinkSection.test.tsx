import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { Couple } from '@you-in-heart/shared'
import { reconnectCouple, unlinkCouple } from '@/modules/couple/data-access-couple/couple-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import UnlinkSection from '../UnlinkSection'

// 경계만 대체: 커플 API(네트워크)
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({
  unlinkCouple: jest.fn(),
  reconnectCouple: jest.fn(),
}))

const ME_ID = '01890a5d-ac96-774b-bcce-b302099a8057'
const PARTNER_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const DAY = 86_400_000

const member = (userId: string, displayName: string, slot: 1 | 2, reconnectConfirmedAt: string | null = null) => ({
  userId,
  displayName,
  slot,
  reconnectConfirmedAt,
})

const ACTIVE: Couple = {
  id: '01890a5d-ac96-774b-bcce-b302099a8001',
  status: 'ACTIVE',
  startedOn: '2025-09-10',
  members: [member(ME_ID, '재명', 1), member(PARTNER_ID, '지은', 2)],
  unlinkRequestedAt: null,
  unlinkRequestedBy: null,
  purgeAfter: null,
}

const UNLINKING: Couple = {
  ...ACTIVE,
  status: 'UNLINKING',
  unlinkRequestedAt: new Date(Date.now() - DAY).toISOString(),
  unlinkRequestedBy: ME_ID,
  purgeAfter: new Date(Date.now() + 29 * DAY - 60_000).toISOString(),
}

const renderSection = (couple: Couple) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <UnlinkSection couple={couple} myUserId={ME_ID} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const openSecondStep = async () => {
  await fireEvent.press(screen.getByRole('button', { name: '커플 연결 해제' }))
  await fireEvent.press(screen.getByRole('button', { name: '계속' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(unlinkCouple).mockResolvedValue(UNLINKING)
})

describe('UnlinkSection — 연결 해제 2단계 확인', () => {
  it('1단계 확인 창에서 취소하면 API를 부르지 않는다', async () => {
    await renderSection(ACTIVE)
    await fireEvent.press(screen.getByRole('button', { name: '커플 연결 해제' }))
    expect(screen.getByText('커플 연결을 해제할까요?')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '취소' }))

    expect(unlinkCouple).toHaveBeenCalledTimes(0)
  })

  it('2단계에서 "연결 해제"를 입력하기 전에는 버튼이 비활성이고 API 호출은 0회다', async () => {
    await renderSection(ACTIVE)
    await openSecondStep()

    expect(screen.getByText('2 / 2')).toBeOnTheScreen()
    expect(screen.getByText('지은님에게 바로 알림이 가요.')).toBeOnTheScreen()
    const confirm = screen.getByRole('button', { name: '연결 해제' })
    expect(confirm).toBeDisabled()

    await fireEvent.changeText(screen.getByLabelText("확인을 위해 '연결 해제'를 입력해 주세요"), '연결')
    await fireEvent.press(confirm)

    expect(unlinkCouple).toHaveBeenCalledTimes(0)
  })

  it('2단계 확인까지 마치면 그때 한 번만 해제를 요청한다', async () => {
    await renderSection(ACTIVE)
    await openSecondStep()
    expect(unlinkCouple).toHaveBeenCalledTimes(0)

    await fireEvent.changeText(screen.getByLabelText("확인을 위해 '연결 해제'를 입력해 주세요"), '연결 해제')
    await fireEvent.press(screen.getByRole('button', { name: '연결 해제' }))

    await waitFor(() => expect(unlinkCouple).toHaveBeenCalledTimes(1))
  })
})

describe('UnlinkSection — 유예 중', () => {
  it('삭제까지 남은 일수와 요청자를 보여주고 해제 행은 없다', async () => {
    await renderSection(UNLINKING)
    expect(screen.getByText('삭제까지')).toBeOnTheScreen()
    expect(screen.getByText('29일')).toBeOnTheScreen()
    expect(screen.getByText(/재명님이 .*에 해제를 요청했어요/)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '커플 연결 해제' })).toBeNull()
  })

  it('다시 연결 요청을 누르면 reconnect를 1번 부른다', async () => {
    jest.mocked(reconnectCouple).mockResolvedValue(UNLINKING)
    await renderSection(UNLINKING)
    await fireEvent.press(screen.getByRole('button', { name: '다시 연결 요청' }))
    await waitFor(() => expect(reconnectCouple).toHaveBeenCalledTimes(1))
  })

  it('내가 이미 확인했으면 상대의 수락을 기다린다(버튼 비활성)', async () => {
    const confirmedByMe = {
      ...UNLINKING,
      members: [member(ME_ID, '재명', 1, new Date().toISOString()), member(PARTNER_ID, '지은', 2)],
    }
    await renderSection(confirmedByMe)
    expect(screen.getByRole('button', { name: '상대의 수락을 기다리는 중' })).toBeDisabled()
  })

  it('상대가 먼저 요청했으면 "다시 연결 수락"', async () => {
    const confirmedByPartner = {
      ...UNLINKING,
      members: [member(ME_ID, '재명', 1), member(PARTNER_ID, '지은', 2, new Date().toISOString())],
    }
    await renderSection(confirmedByPartner)
    expect(screen.getByRole('button', { name: '다시 연결 수락' })).toBeEnabled()
  })
})
