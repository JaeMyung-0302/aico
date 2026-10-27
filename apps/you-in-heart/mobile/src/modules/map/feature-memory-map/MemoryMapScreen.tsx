import type { PlaceSearchResult } from '@you-in-heart/shared'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SHADOW } from '@/design-system/tokens/shadow'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLocationConsent } from '@/modules/settings/feature-location-consent/useLocationConsent'
import { useCreatePlace, usePlaces } from '../data-access-place/usePlaces'
import MemoryMap from '../ui-memory-map'
import PlaceSearchPanel from '../ui-place-search/PlaceSearchPanel'
import { LocationOffCard, NoPinsCard } from './MapStateCards'
import PlacePreviewSheet from './PlacePreviewSheet'

const toCreateRequest = ({ name, lat, lng, kakaoPlaceId, address }: PlaceSearchResult) => ({
  name: name.slice(0, 50),
  lat,
  lng,
  kakaoPlaceId,
  ...(address ? { address } : {}),
})

// 검색에서 고른 곳을 남기고(고르는 순간이 확인) 그 핀으로 카메라를 옮긴다
const usePlaceFromSearch = (onCreated: (placeId: string, focus: { lat: number; lng: number }) => void) => {
  const [isOpen, setIsOpen] = useState(false)
  const create = useCreatePlace()
  const select = (result: PlaceSearchResult) =>
    create.mutate(toCreateRequest(result), {
      onSuccess: (place) => {
        setIsOpen(false)
        onCreated(place.id, { lat: place.lat, lng: place.lng })
      },
    })
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), select, create }
}

// SCR-10 추억 지도: 핀·클러스터, 핀을 누르면 기록 시트, 상단 검색. LOCATION 동의가 꺼져 있으면 켜기 안내만
const MemoryMapScreen = () => {
  const insets = useSafeAreaInsets()
  const consent = useLocationConsent()
  const places = usePlaces({ isEnabled: consent.isOn })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null)
  const search = usePlaceFromSearch((placeId, next) => {
    setSelectedId(placeId)
    setFocus(next)
  })

  if (!consent.isKnown) return null
  if (!consent.isOn) {
    return (
      <View style={styles.screen}>
        <LocationOffCard isPending={consent.isPending} onTurnOn={() => consent.setLocation(true)} />
      </View>
    )
  }
  if (places.isError) {
    return <EmptyLayout icon="alert" title="지도를 불러오지 못했어요" onRetry={() => places.refetch()} />
  }

  const items = places.data ?? []
  const selected = items.find((place) => place.id === selectedId) ?? null
  return (
    <View style={styles.screen}>
      <MemoryMap places={items} focus={focus} onPlacePress={setSelectedId} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="다녀온 곳 검색"
        onPress={search.open}
        style={[styles.search, { top: insets.top + SPACING[2] }]}
      >
        <Icon name="search" size={18} color="ink3" />
        <AppText variant="label" color="ink3">
          다녀온 곳 검색
        </AppText>
      </Pressable>
      {items.length > 0 ? (
        <View style={[styles.count, { top: insets.top + 68 }]}>
          <AppText variant="captionStrong" color="bg" style={styles.countText}>
            {`함께 간 곳 ${items.length}곳`}
          </AppText>
        </View>
      ) : null}
      {places.isSuccess && items.length === 0 ? <NoPinsCard onSearch={search.open} /> : null}
      {selected ? <PlacePreviewSheet place={selected} onClose={() => setSelectedId(null)} /> : null}
      <BottomSheet isVisible={search.isOpen} onClose={search.close}>
        <PlaceSearchPanel isBusy={search.create.isPending} onSelect={search.select} />
        {search.create.isError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            장소를 남기지 못했어요. 잠시 후 다시 시도해 주세요
          </AppText>
        ) : null}
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  search: {
    position: 'absolute',
    left: SPACING[4],
    right: SPACING[4],
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bg,
    ...SHADOW[1],
  },
  count: {
    position: 'absolute',
    left: SPACING[4],
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.ink,
  },
  countText: { fontSize: 12 },
})

export default MemoryMapScreen
