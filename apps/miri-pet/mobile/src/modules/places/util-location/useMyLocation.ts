import type { LatLng } from '@miri-pet/shared'
import * as Location from 'expo-location'
import { useMyConsents } from '@/modules/settings/data-access-consents/useMyConsents'
import { isConsentAgreed } from '@/modules/settings/util-consents/consent-rows'
import { useAppConfig } from '../data-access-places/usePlaces'
import { isGpsBuildEnabled } from './gps-build-flag'

export type LocateResult = { kind: 'ok'; coords: LatLng } | { kind: 'denied' } | { kind: 'error' }

// 좌표는 지도 카메라 이동에만 쓰고 서버로 보내지 않는다 (위치정보법 리스크 최소화, D4)
const locate = async (): Promise<LocateResult> => {
  try {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') return { kind: 'denied' }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return { kind: 'ok', coords: { lat: position.coords.latitude, lng: position.coords.longitude } }
  } catch {
    return { kind: 'error' }
  }
}

const denyLocate = async (): Promise<LocateResult> => ({ kind: 'denied' })

// 위치기반서비스 동의(LOCATION)가 없거나 철회했으면 기기 위치를 요청하지 않는다
export const useMyLocation = () => {
  const { data: config } = useAppConfig()
  const isGpsEnabled = isGpsBuildEnabled() && config?.isGpsEnabled === true
  const consents = useMyConsents({ isEnabled: isGpsEnabled })
  const isConsented = isConsentAgreed(consents.data, 'LOCATION')
  return { isAvailable: isGpsEnabled && isConsented, locate: isConsented ? locate : denyLocate }
}
