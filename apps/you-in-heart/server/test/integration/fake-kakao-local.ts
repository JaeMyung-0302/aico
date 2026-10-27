import type { PlaceSearchResult } from '@you-in-heart/shared'
import type { KakaoLocalClient } from '../../src/places/kakao-local.client'

export type FakeKakaoLocal = Pick<KakaoLocalClient, 'search' | 'reverse'> & {
  calls: () => number
  reset: () => void
}

export const FAKE_SEARCH_RESULT: PlaceSearchResult = {
  kakaoPlaceId: '26338954',
  name: '성수 카페',
  address: '서울 성동구 연무장길 1',
  lat: 37.5443,
  lng: 127.0559,
}

// 카카오 로컬 REST 대역: 네트워크 없이 고정 결과를 주고 호출 수만 센다(실제 매핑은 kakao-local.client.spec)
export const createFakeKakaoLocal = (): FakeKakaoLocal => {
  let count = 0
  return {
    search: async () => {
      count += 1
      return [FAKE_SEARCH_RESULT]
    },
    reverse: async () => {
      count += 1
      return FAKE_SEARCH_RESULT.address
    },
    calls: () => count,
    reset: () => {
      count = 0
    },
  }
}
