import { renderHook, waitFor } from '@testing-library/react-native'
import * as Location from 'expo-location'
import { fetchMyConsents } from '@/modules/settings/data-access-consents/consents-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { fetchAppConfig } from '../data-access-places/places-api'
import { isGpsBuildEnabled } from '../util-location/gps-build-flag'
import { useMyLocation } from '../util-location/useMyLocation'

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}))
jest.mock('../data-access-places/places-api', () => ({ fetchAppConfig: jest.fn() }))
jest.mock('../util-location/gps-build-flag', () => ({ isGpsBuildEnabled: jest.fn(() => true) }))
jest.mock('@/modules/settings/data-access-consents/consents-api', () => ({ fetchMyConsents: jest.fn() }))

const LOCATION_CONSENT = { kind: 'LOCATION' as const, version: 'v1', agreedAt: '2026-10-01T03:00:00.000Z' }

const renderUseMyLocation = () =>
  renderHook(() => useMyLocation(), { wrapper: ({ children }) => <QueryTestProvider>{children}</QueryTestProvider> })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(isGpsBuildEnabled).mockReturnValue(true)
  jest.mocked(fetchAppConfig).mockResolvedValue({ isGpsEnabled: true })
  jest.mocked(fetchMyConsents).mockResolvedValue([{ ...LOCATION_CONSENT, withdrawnAt: null }])
})

describe('useMyLocation', () => {
  it('빌드 플래그 + 서버 플래그가 모두 켜지면 사용 가능', async () => {
    const { result } = await renderUseMyLocation()
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
  })

  it('빌드 플래그가 꺼져 있으면 서버 플래그와 무관하게 사용 불가', async () => {
    jest.mocked(isGpsBuildEnabled).mockReturnValue(false)
    const { result } = await renderUseMyLocation()
    await waitFor(() => expect(fetchAppConfig).toHaveBeenCalled())
    expect(result.current.isAvailable).toBe(false)
  })

  it('권한 허용 → 좌표(카메라 이동용)를 돌려준다', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    })
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: {
        latitude: 37.5,
        longitude: 127.1,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 0,
    })
    const { result } = await renderUseMyLocation()
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    await expect(result.current.locate()).resolves.toEqual({ kind: 'ok', coords: { lat: 37.5, lng: 127.1 } })
  })

  it('위치 조회가 실패하면 error', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockRejectedValue(new Error('services off'))
    const { result } = await renderUseMyLocation()
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    await expect(result.current.locate()).resolves.toEqual({ kind: 'error' })
  })

  it.each([
    ['철회했으면', [{ ...LOCATION_CONSENT, withdrawnAt: '2026-10-05T03:00:00.000Z' }]],
    ['동의한 적이 없으면', []],
  ])('위치기반서비스 동의를 %s 사용 불가 + 기기 위치를 요청하지 않는다', async (_label, consents) => {
    jest.mocked(fetchMyConsents).mockResolvedValue(consents)
    const { result } = await renderUseMyLocation()
    await waitFor(() => expect(fetchMyConsents).toHaveBeenCalled())
    await waitFor(() => expect(fetchAppConfig).toHaveBeenCalled())
    expect(result.current.isAvailable).toBe(false)
    await expect(result.current.locate()).resolves.toEqual({ kind: 'denied' })
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
  })

  it('GPS 플래그가 꺼져 있으면 동의 내역도 조회하지 않는다', async () => {
    jest.mocked(isGpsBuildEnabled).mockReturnValue(false)
    await renderUseMyLocation()
    await waitFor(() => expect(fetchAppConfig).toHaveBeenCalled())
    expect(fetchMyConsents).not.toHaveBeenCalled()
  })
})
