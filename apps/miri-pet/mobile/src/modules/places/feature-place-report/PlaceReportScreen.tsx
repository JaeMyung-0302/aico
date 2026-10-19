import { type LatLng, MAX_PLACE_REPORT_IMAGES, type Place, type PlaceReportKind } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import KeyboardAvoider from '@/design-system/components/KeyboardAvoider'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SCREEN_GUTTER, SPACING } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { pickImagesOrEmpty } from '@/modules/media/util-pick-image/pick-images'
import { PHOTO_PERMISSION_MESSAGE } from '@/modules/media/util-pick-image/pick-image-or-null'
import { track } from '@/shared/analytics/track'
import { ApiError } from '@/shared/api/api-error'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { useCreatePlaceReport, usePlace } from '../data-access-places/usePlaces'
import PlaceReportForm from '../ui-place-report-form/PlaceReportForm'
import { buildPlaceReportRequest, draftFromPlace, type PlaceReportDraft } from '../util-place-report'

export type PlaceReportScreenProps = { placeId?: string; location?: LatLng }

const REVIEW_NOTICE = '운영자가 확인한 뒤 반영돼요. 처리 결과는 알림으로 알려드릴게요.'

const submitErrorMessage = (error: unknown): string =>
  error instanceof ApiError && error.status === 404
    ? '장소를 찾을 수 없어요'
    : '제보를 보내지 못했어요. 잠시 후 다시 시도해 주세요'

const UPLOAD_ERROR_MESSAGE = '사진을 올리지 못했어요. 다시 시도해 주세요'

// 안내문 사진은 고른 순서대로 PLACE_REPORT(비공개)로 올린다. 하나라도 실패하면 제보를 보내지 않는다
const uploadPhotos = async (photos: readonly PickedImage[]): Promise<string[] | null> => {
  try {
    return await Promise.all(photos.map((photo) => uploadImage(photo, 'PLACE_REPORT')))
  } catch {
    return null
  }
}

const goBack = () => {
  if (router.canGoBack()) router.back()
}

const SubmittedView = () => (
  <View style={styles.submitted}>
    <AppText variant="title2" accessibilityRole="header">
      검수 대기 중이에요
    </AppText>
    <AppText variant="callout" color="ink2" style={styles.center}>
      {REVIEW_NOTICE}
    </AppText>
    <Button label="확인" onPress={goBack} />
  </View>
)

const TargetCard = ({ place }: { place: Place }) => (
  <View style={styles.target}>
    <AppText variant="caption" color="ink2">
      대상 장소
    </AppText>
    <AppText variant="bodyStrong">{place.name}</AppText>
  </View>
)

type ReportBodyProps = { place?: Place; location?: LatLng }

const ReportBody = ({ place, location }: ReportBodyProps) => {
  const insets = useSafeAreaInsets()
  const kinds: readonly PlaceReportKind[] = place ? ['EDIT', 'CLOSED'] : ['NEW']
  const [initialDraft] = useState<PlaceReportDraft>(() => draftFromPlace(place, kinds[0] ?? 'NEW'))
  const [draft, setDraft] = useState<PlaceReportDraft>(initialDraft)
  const [message, setMessage] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PickedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const mutation = useCreatePlaceReport()
  // 보내는 중·보낸 뒤(검수 대기 화면)에는 묻지 않는다
  const hasDraft = photos.length > 0 || JSON.stringify(draft) !== JSON.stringify(initialDraft)
  useConfirmLeave(hasDraft && !isUploading && !mutation.isPending && !mutation.isSuccess)

  const handleAddPhotos = async () => {
    const picked = await pickImagesOrEmpty(MAX_PLACE_REPORT_IMAGES - photos.length, () =>
      setMessage(PHOTO_PERMISSION_MESSAGE),
    )
    if (picked.length > 0) setPhotos((current) => [...current, ...picked].slice(0, MAX_PLACE_REPORT_IMAGES))
  }
  const handleRemovePhoto = (index: number) => setPhotos((current) => current.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    const result = buildPlaceReportRequest(draft, { place, location })
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setMessage(null)
    setIsUploading(true)
    const mediaIds = await uploadPhotos(photos)
    setIsUploading(false)
    if (!mediaIds) {
      setMessage(UPLOAD_ERROR_MESSAGE)
      return
    }
    try {
      await mutation.mutateAsync(mediaIds.length > 0 ? { ...result.request, mediaIds } : result.request)
      track('place_report_submitted', { kind: result.request.kind })
    } catch (error) {
      setMessage(submitErrorMessage(error))
    }
  }

  if (mutation.isSuccess) return <SubmittedView />

  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {place ? <TargetCard place={place} /> : null}
        {!place && location ? (
          <AppText variant="caption" color="ink2">
            지도에서 보던 위치(지도 중심)로 등록돼요. 정확한 위치는 운영자가 확인해요.
          </AppText>
        ) : null}
        <PlaceReportForm
          draft={draft}
          kinds={kinds}
          onChange={setDraft}
          photoPicker={{
            photos,
            onAdd: () => {
              handleAddPhotos().catch(() => setMessage(PHOTO_PERMISSION_MESSAGE))
            },
            onRemove: handleRemovePhoto,
          }}
        />
        <AppText variant="caption" color="ink2">
          {REVIEW_NOTICE}
        </AppText>
        {message ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Button label="제보 보내기" isLoading={isUploading || mutation.isPending} onPress={handleSubmit} />
      </View>
    </>
  )
}

// 11 장소 제보: placeId가 있으면 수정·폐업 제보, 없으면 지도 중심 좌표로 새 장소 제보
const PlaceReportScreen = ({ placeId, location }: PlaceReportScreenProps) => {
  const placeQuery = usePlace(placeId)
  const isLoadingPlace = Boolean(placeId) && placeQuery.isPending
  const isMissingPlace = Boolean(placeId) && placeQuery.isError

  return (
    <KeyboardAvoider style={styles.flex}>
      <AppHeader title="장소 제보" />
      {isLoadingPlace ? <ActivityIndicator style={styles.flex} color={COLORS.primary} /> : null}
      {isMissingPlace ? <EmptyLayout title="장소 정보를 불러오지 못했어요" /> : null}
      {!isLoadingPlace && !isMissingPlace ? <ReportBody place={placeQuery.data} location={location} /> : null}
    </KeyboardAvoider>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.ground },
  content: { padding: SCREEN_GUTTER, gap: SPACING.lg },
  target: { gap: SPACING.xxs, padding: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  footer: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, backgroundColor: COLORS.surface },
  submitted: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, padding: SCREEN_GUTTER },
  center: { textAlign: 'center' },
})

export default PlaceReportScreen
