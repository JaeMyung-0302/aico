import { Platform } from 'react-native'

// 0B S6(Android 사진 EXIF 위치) 결과로 고정하는 값. 스파이크가 아직 보류라 지원으로 둔다 — 실기기 FAIL 이면 false 로 바꾼다
export const IS_ANDROID_LOCATION_SUPPORTED = true

// false 면 사진 위치 제안 없이 "지도에서 직접 고르기"만 보인다 (plan 2B.3 분기)
export const canSuggestFromPhotos = (): boolean => !(Platform.OS === 'android' && !IS_ANDROID_LOCATION_SUPPORTED)
