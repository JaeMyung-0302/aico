import type { MyConsent } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { fetchMyConsents, updateConsent, withdrawCertificateConsent } from '../data-access-consents/consents-api'
import ConsentsScreen from '../feature-consents/ConsentsScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('../data-access-consents/consents-api', () => ({
  fetchMyConsents: jest.fn(),
  updateConsent: jest.fn(),
  withdrawCertificateConsent: jest.fn(),
}))

const AGREED_AT = '2026-10-01T03:00:00.000Z'
const WITHDRAWN_AT = '2026-10-05T03:00:00.000Z'
const consent = (kind: MyConsent['kind'], withdrawnAt: string | null = null): MyConsent => ({
  kind,
  version: '2026-10-01',
  agreedAt: AGREED_AT,
  withdrawnAt,
})
const CONSENTS: MyConsent[] = [consent('TERMS'), consent('PRIVACY'), consent('LOCATION'), consent('CERTIFICATE')]

const renderScreen = async () => {
  const view = await render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <ConsentsScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )
  await screen.findByRole('switch', { name: '위치기반서비스 이용' })
  return { view, user: userEvent.setup() }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchMyConsents).mockResolvedValue(CONSENTS)
})

describe('ConsentsScreen (설정 > 동의 내역 관리)', () => {
  it('동의별 날짜를 보여주고, 필수 동의는 토글 없이 탈퇴 안내만 한다', async () => {
    await renderScreen()

    expect(screen.getByText('서비스 이용약관')).toBeOnTheScreen()
    expect(screen.getAllByText('2026.10.01 동의').length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByRole('switch', { name: '서비스 이용약관' })).not.toBeOnTheScreen()
    expect(screen.getByText(/필수 동의를 철회하려면 회원 탈퇴/)).toBeOnTheScreen()
    expect(screen.getByRole('switch', { name: '위치기반서비스 이용' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '마케팅 정보 수신' })).not.toBeChecked()
    expect(screen.queryByRole('switch', { name: '증명서 사진 보관' })).not.toBeOnTheScreen()
  })

  it('선택 동의 켜기 → 바로 PATCH 후 토스트', async () => {
    jest.mocked(updateConsent).mockResolvedValue([...CONSENTS, consent('MARKETING')])
    const { user } = await renderScreen()

    await user.press(screen.getByRole('switch', { name: '마케팅 정보 수신' }))

    expect(updateConsent).toHaveBeenCalledWith({ kind: 'MARKETING', isAgreed: true })
    expect(await screen.findByText('마케팅 정보 수신에 동의했어요')).toBeOnTheScreen()
    expect(screen.getByRole('switch', { name: '마케팅 정보 수신' })).toBeChecked()
  })

  it('선택 동의 끄기 → 확인 창에서 철회해야 PATCH, 취소하면 그대로', async () => {
    jest
      .mocked(updateConsent)
      .mockResolvedValue([
        consent('TERMS'),
        consent('PRIVACY'),
        consent('LOCATION', WITHDRAWN_AT),
        consent('CERTIFICATE'),
      ])
    const { user } = await renderScreen()

    await user.press(screen.getByRole('switch', { name: '위치기반서비스 이용' }))
    expect(screen.getByRole('header', { name: '위치기반서비스 이용 동의를 철회할까요?' })).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '취소' }))
    expect(updateConsent).not.toHaveBeenCalled()

    await user.press(screen.getByRole('switch', { name: '위치기반서비스 이용' }))
    await user.press(screen.getByRole('button', { name: '철회하기' }))

    expect(updateConsent).toHaveBeenCalledWith({ kind: 'LOCATION', isAgreed: false })
    expect(await screen.findByText('위치기반서비스 이용 동의를 철회했어요')).toBeOnTheScreen()
    expect(screen.getByRole('switch', { name: '위치기반서비스 이용' })).not.toBeChecked()
    expect(screen.getByText('2026.10.05 철회')).toBeOnTheScreen()
  })

  it('변경에 실패하면 실패 토스트', async () => {
    jest.mocked(updateConsent).mockRejectedValue(new Error('500'))
    const { user } = await renderScreen()
    await user.press(screen.getByRole('switch', { name: '마케팅 정보 수신' }))
    expect(await screen.findByText('바꾸지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
  })

  it('증명서 보관 동의는 읽기 전용이고, 철회는 사진 삭제 안내 후 기존 철회 API로 한다', async () => {
    jest.mocked(withdrawCertificateConsent).mockResolvedValue({ withdrawnAt: WITHDRAWN_AT, deletedCertificateCount: 2 })
    const { user } = await renderScreen()

    await user.press(screen.getByRole('button', { name: '증명서 사진 보관 동의 철회' }))
    expect(screen.getByText(/보관된 증명서 사진이 모두 지워져요/)).toBeOnTheScreen()
    jest
      .mocked(fetchMyConsents)
      .mockResolvedValue([consent('TERMS'), consent('PRIVACY'), consent('CERTIFICATE', WITHDRAWN_AT)])
    await user.press(screen.getByRole('button', { name: '철회하기' }))

    expect(withdrawCertificateConsent).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('증명서 사진 보관 동의를 철회했어요')).toBeOnTheScreen()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '증명서 사진 보관 동의 철회' })).not.toBeOnTheScreen(),
    )
  })

  it('목록을 못 불러오면 안내', async () => {
    jest.mocked(fetchMyConsents).mockRejectedValue(new Error('500'))
    await render(
      <SafeAreaTestProvider>
        <QueryTestProvider>
          <ConsentsScreen />
        </QueryTestProvider>
      </SafeAreaTestProvider>,
    )
    expect(await screen.findByText('동의 내역을 불러오지 못했어요')).toBeOnTheScreen()
  })
})
