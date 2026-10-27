import type { ExportJob } from '@you-in-heart/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { FIXED_NOW_MS, mockClockAt } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { fetchLatestExport, requestExport } from '../export-api'
import ExportSection from '../ExportSection'

jest.mock('../export-api', () => ({ fetchLatestExport: jest.fn(), requestExport: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const JOB_ID = '01890a5d-ac96-774b-bcce-b302099a8501'
const job = (overrides: Partial<ExportJob>): ExportJob => ({
  id: JOB_ID,
  status: 'PENDING',
  createdAt: '2026-10-27T02:00:00.000Z',
  downloadUrl: null,
  expiresAt: null,
  ...overrides,
})

const renderSection = () =>
  render(
    <QueryTestProvider>
      <ExportSection />
    </QueryTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchLatestExport).mockResolvedValue(null)
  jest.mocked(requestExport).mockResolvedValue(job({ status: 'PENDING' }))
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ExportSection (SCR-16 내보내기)', () => {
  it('작업이 없으면 "모든 기록 내보내기" 행. 누르면 POST /export 후 진행 상태를 보여준다', async () => {
    await renderSection()
    await fireEvent.press(await screen.findByRole('button', { name: '모든 기록 내보내기 사진 원본 포함 · zip' }))

    await waitFor(() => expect(requestExport).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('내보내기 준비 중')).toBeOnTheScreen()
    expect(screen.getByText('다 되면 알림으로 알려드려요. 링크는 24시간 동안 유효해요.')).toBeOnTheScreen()
  })

  it('앱을 다시 열면 GET /export 로 진행 중인 작업을 이어서 보여준다', async () => {
    jest.mocked(fetchLatestExport).mockResolvedValue(job({ status: 'RUNNING' }))
    await renderSection()
    expect(await screen.findByText('내보내기 준비 중')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /모든 기록 내보내기/ })).toBeNull()
  })

  it('완료되면 다운로드 링크(만료 시각 안내)를 연다', async () => {
    jest.mocked(fetchLatestExport).mockResolvedValue(
      job({ status: 'READY', downloadUrl: 'https://r2.test/export.zip?sig=24h', expiresAt: '2026-10-28T03:00:00.000Z' }),
    )
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderSection()

    expect(await screen.findByText('내보내기가 준비됐어요')).toBeOnTheScreen()
    expect(screen.getByText('2026. 10. 28 12:00까지 받을 수 있어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'zip 내려받기' }))
    expect(openURL).toHaveBeenCalledWith('https://r2.test/export.zip?sig=24h')
  })

  it('링크가 만료됐거나 실패한 작업이면 다시 요청할 수 있다', async () => {
    jest.mocked(fetchLatestExport).mockResolvedValue(job({ status: 'FAILED' }))
    await renderSection()
    expect(await screen.findByText('지난 내보내기를 마치지 못했어요. 다시 요청해 주세요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '모든 기록 내보내기 사진 원본 포함 · zip' }))
    await waitFor(() => expect(requestExport).toHaveBeenCalled())
  })

  it('곧 삭제될 커플(409 PURGE_IMMINENT)이면 안내한다', async () => {
    jest
      .mocked(requestExport)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 409, message: 'x', serverCode: 'PURGE_IMMINENT' }))
    await renderSection()
    await fireEvent.press(await screen.findByRole('button', { name: '모든 기록 내보내기 사진 원본 포함 · zip' }))
    expect(await screen.findByText('곧 기록이 삭제돼 내보내기를 시작할 수 없어요')).toBeOnTheScreen()
  })
})
