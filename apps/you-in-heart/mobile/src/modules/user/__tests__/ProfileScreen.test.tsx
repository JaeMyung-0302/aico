import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { putConsents, updateMe } from '@/modules/user/data-access-me/me-api'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'
import { ME } from '@/test-utils/fixtures'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import ProfileScreen from '../feature-profile/ProfileScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({
  fetchMe: jest.fn(() => new Promise(() => undefined)),
  updateMe: jest.fn(),
  putConsents: jest.fn(),
}))

const NEW_USER = { ...ME, displayName: null, couple: null, consents: { terms: false, privacy: false, location: false } }

const renderProfile = (me: typeof ME) => {
  const client = createTestQueryClient()
  client.setQueryData(ME_QUERY_KEY, me)
  return render(
    <SafeAreaTestProvider>
      <QueryTestProvider client={client}>
        <ProfileScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(putConsents).mockResolvedValue({ terms: true, privacy: true, location: false })
})

describe('ProfileScreen', () => {
  it('이름이 비면 두 버튼 모두 비활성이다', async () => {
    await renderProfile(NEW_USER)
    expect(screen.getByRole('button', { name: '초대 코드 만들기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '받은 코드 입력하기' })).toBeDisabled()
  })

  it('새 사용자: 필수 동의와 이름을 저장한 뒤 게이트가 페어링을 열면 고른 화면으로 간다', async () => {
    jest.mocked(updateMe).mockResolvedValue({ ...NEW_USER, displayName: '재명' })
    await renderProfile(NEW_USER)
    await fireEvent.changeText(screen.getByLabelText('표시 이름'), '재명')
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '받은 코드 입력하기' }))
    })

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pairing/join'))
    expect(putConsents).toHaveBeenCalledWith({ terms: true, privacy: true, location: false })
    expect(updateMe).toHaveBeenCalledWith({ displayName: '재명' })
  })

  it('이미 이름이 있고 그대로면 저장 없이 바로 초대 코드 화면으로 간다', async () => {
    await renderProfile({ ...ME, couple: null })
    await fireEvent.press(screen.getByRole('button', { name: '초대 코드 만들기' }))
    expect(router.push).toHaveBeenCalledWith('/pairing')
    expect(updateMe).not.toHaveBeenCalled()
    expect(putConsents).not.toHaveBeenCalled()
  })

  it('페어링 단계에서 이름만 바꾸면 저장 후 바로 이동한다', async () => {
    jest.mocked(updateMe).mockResolvedValue({ ...ME, displayName: '재명2', couple: null })
    await renderProfile({ ...ME, couple: null })
    await fireEvent.changeText(screen.getByLabelText('표시 이름'), '재명2')
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '초대 코드 만들기' }))
    })
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pairing'))
  })

  it('저장에 실패하면 안내하고 이동하지 않는다', async () => {
    jest.mocked(updateMe).mockRejectedValue(new Error('500'))
    await renderProfile(NEW_USER)
    await fireEvent.changeText(screen.getByLabelText('표시 이름'), '재명')
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '초대 코드 만들기' }))
    })
    expect(await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(router.push).not.toHaveBeenCalled()
  })
})
