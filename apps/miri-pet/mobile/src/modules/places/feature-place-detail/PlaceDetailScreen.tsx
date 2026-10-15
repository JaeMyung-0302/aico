import type { Place } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SCREEN_GUTTER, SPACING } from '@/design-system/tokens/spacing'
import { track } from '@/shared/analytics/track'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import { usePlace } from '../data-access-places/usePlaces'
import { openDirections } from '../util-place-directions'
import { categoryLabel, formatVerifiedLine, sizesLabel } from '../util-place-format'
import PlacePostsSection from './PlacePostsSection'

type PlaceDetailScreenProps = { placeId: string | undefined }

const ConditionRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.conditionRow}>
    <AppText variant="calloutStrong" color="ink2" style={styles.conditionLabel}>
      {label}
    </AppText>
    <AppText variant="callout" style={styles.flex}>
      {value}
    </AppText>
  </View>
)

const PlaceBody = ({ place }: { place: Place }) => (
  <>
    <View style={styles.titleBlock}>
      <AppText variant="captionStrong" color="primary">
        {categoryLabel(place.category)}
      </AppText>
      <AppText variant="title2" accessibilityRole="header">
        {place.name}
      </AppText>
      <AppText variant="callout" color="ink2">
        {place.address}
      </AppText>
    </View>
    <View style={styles.card}>
      <AppText variant="bodyStrong">동반 조건</AppText>
      <ConditionRow label="크기" value={sizesLabel(place.allowedSizes) || '정보 없음'} />
      <ConditionRow label="실내" value={place.indoorAllowed ? '가능' : '불가 (실외만)'} />
      {place.conditionsNote ? <ConditionRow label="메모" value={place.conditionsNote} /> : null}
    </View>
    <AppText variant="caption" color="ink3">
      {formatVerifiedLine(place)}
    </AppText>
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/places/report', params: { placeId: place.id } })}
    >
      <AppText variant="calloutStrong" color="primary">
        정보가 달라요 · 제보하기
      </AppText>
    </Pressable>
  </>
)

// 10 장소 상세: 조건·출처·최종 확인일, 여기서 찍은 게시물, 외부 지도 앱 길찾기
const PlaceDetailScreen = ({ placeId }: PlaceDetailScreenProps) => {
  const insets = useSafeAreaInsets()
  const { data: place, isPending, isError } = usePlace(placeId)
  const toast = useTransientMessage()

  useEffect(() => {
    if (place) track('place_viewed', { placeId: place.id, category: place.category })
  }, [place])

  const handleDirectionsPress = async () => {
    if (!place) return
    const opened = await openDirections({ name: place.name, lat: place.lat, lng: place.lng })
    if (!opened) toast.show('지도 앱을 열지 못했어요')
  }

  if (isError || !placeId) {
    return (
      <View style={styles.flex}>
        <AppHeader title="장소" />
        <EmptyLayout title="장소 정보를 불러오지 못했어요" description="없어졌거나 숨겨진 장소일 수 있어요" />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="장소" />
      {isPending ? (
        <ActivityIndicator style={styles.flex} color={COLORS.primary} />
      ) : (
        <>
          <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
            <PlaceBody place={place} />
            <PlacePostsSection placeId={place.id} />
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
            <Button label="지도 앱으로 길찾기" onPress={handleDirectionsPress} />
          </View>
        </>
      )}
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.ground },
  content: { padding: SCREEN_GUTTER, gap: SPACING.lg },
  titleBlock: { gap: SPACING.xs },
  card: { gap: SPACING.sm, padding: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  conditionRow: { flexDirection: 'row', gap: SPACING.md },
  conditionLabel: { width: 40 },
  footer: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, backgroundColor: COLORS.surface },
})

export default PlaceDetailScreen
