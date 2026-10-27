import { router } from 'expo-router'
import { useState } from 'react'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { reversePlace } from '../data-access-place/place-api'
import { clusterPhotoLocations } from '../util-pin-suggestion/cluster-photo-locations'
import { canSuggestFromPhotos } from '../util-pin-suggestion/location-support'
import { readPhotoLocations } from '../util-pin-suggestion/read-photo-locations'
import { suggestionName } from '../util-pin-suggestion/suggestion-name'
import type { PinSuggestion } from './PinSuggestionSheet'

// 고른 사진의 촬영 위치 → 묶기 → 이름(역지오코딩, 실패하면 기본 이름). 좌표는 기기 밖으로는 역지오코딩에만 쓴다
export const loadPinSuggestions = async (
  assetIds: readonly string[],
  { hasLocationConsent }: { hasLocationConsent: boolean },
): Promise<PinSuggestion[]> => {
  if (!hasLocationConsent) return []
  const clusters = clusterPhotoLocations(await readPhotoLocations(assetIds), { hasLocationConsent })
  return Promise.all(
    clusters.map(async (cluster) => {
      const address = await reversePlace(cluster).catch(() => null)
      return { ...cluster, name: suggestionName(address), address }
    }),
  )
}

type OpenSheet = { entryId: string; suggestions: PinSuggestion[]; isManualOnly: boolean }

// SCR-05 저장 뒤 핀 제안(plan 2B.3). 제안을 찾는 동안·시트가 열린 동안 isPending — 작성 화면은 그동안 상세로 넘어가지 않는다
export const usePinSuggestionFlow = () => {
  const me = useMe()
  const hasLocationConsent = me.data?.consents.location === true
  const [isLoading, setIsLoading] = useState(false)
  const [sheet, setSheet] = useState<OpenSheet | null>(null)

  const start = (entryId: string, assetIds: readonly string[]) => {
    if (!hasLocationConsent || assetIds.length === 0) return
    if (!canSuggestFromPhotos()) return setSheet({ entryId, suggestions: [], isManualOnly: true })
    setIsLoading(true)
    loadPinSuggestions(assetIds, { hasLocationConsent })
      .then((suggestions) => {
        if (suggestions.length > 0) setSheet({ entryId, suggestions, isManualOnly: false })
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false))
  }

  const close = () => setSheet(null)
  const pickOnMap = () => {
    setSheet(null)
    router.push('/map')
  }

  return { start, close, pickOnMap, sheet, isPending: isLoading || sheet !== null }
}
