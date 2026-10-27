import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { deleteMe, fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import SettingsScreen from '../feature-settings/SettingsScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn(), deleteMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('../feature-export/export-api', () => ({ fetchLatestExport: jest.fn(async () => null), requestExport: jest.fn() }))
jest.mock('@/modules/auth/data-access-auth/auth-api', () => ({ logoutSession: jest.fn(async () => undefined) }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const renderSettings = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <SettingsScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(deleteMe).mockResolvedValue(undefined)
})

describe('SettingsScreen', () => {
  it('표시 이름·사귄 날을 보여주고, 사귄 날을 누르면 수정 화면으로 간다', async () => {
    await renderSettings()
    expect(await screen.findByText('재명')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '사귄 날 2025. 09. 10' }))
    expect(router.push).toHaveBeenCalledWith('/pairing/started-on')
  })

  it('데이터: 내보내기·연결 해제 행이 있다 (ACTIVE)', async () => {
    await renderSettings()
    expect(await screen.findByRole('button', { name: '커플 연결 해제' })).toBeOnTheScreen()
    expect(await screen.findByRole('button', { name: '모든 기록 내보내기 사진 원본 포함 · zip' })).toBeOnTheScreen()
  })

  it('연결 해제 유예 중에도 내보내기를 할 수 있다', async () => {
    jest.mocked(fetchCouple).mockResolvedValue({ ...ACTIVE_COUPLE, status: 'UNLINKING', purgeAfter: '2026-11-26T03:00:00.000Z' })
    await renderSettings()
    expect(await screen.findByRole('button', { name: '모든 기록 내보내기 사진 원본 포함 · zip' })).toBeOnTheScreen()
  })

  it('회원 탈퇴는 확인 창의 "탈퇴"를 누르기 전에는 DELETE /me 를 보내지 않는다', async () => {
    await renderSettings()
    await fireEvent.press(await screen.findByRole('button', { name: '회원 탈퇴' }))
    expect(screen.getByText('회원 탈퇴할까요?')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '취소' }))
    expect(deleteMe).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '회원 탈퇴' }))
    await fireEvent.press(screen.getByRole('button', { name: '탈퇴' }))

    await waitFor(() => expect(deleteMe).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(session.getStatus()).toBe('signedOut'))
  })

  it('로그아웃하면 세션이 끝난다', async () => {
    await renderSettings()
    await fireEvent.press(await screen.findByRole('button', { name: '로그아웃' }))
    await waitFor(() => expect(session.getStatus()).toBe('signedOut'))
  })
})
