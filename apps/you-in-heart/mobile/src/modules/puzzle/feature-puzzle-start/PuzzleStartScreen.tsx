import { puzzleEndsOn, toKstDate } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFrameWidth } from '@/design-system/components/AppFrame'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { usePhotos } from '@/modules/album/data-access-album/usePhotos'
import { useAnniversaries } from '@/modules/anniversary/data-access-anniversary/useAnniversaries'
import { findNextAnniversary } from '@/modules/anniversary/util-anniversary/anniversary-view'
import UnlinkingBlockedSheet from '@/modules/couple/ui-unlinking-sheet/UnlinkingBlockedSheet'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'
import { isApiErrorKind } from '@/shared/api/api-error'
import { useNow } from '@/shared/hooks/use-now'
import { useToast } from '@/shared/hooks/use-toast'
import { useCreatePuzzle } from '../data-access-puzzle/usePuzzles'
import { periodOptions } from '../util-puzzle/puzzle-view'

const MINUTE_MS = 60_000
const PHOTO_COLUMNS = 3
const PHOTO_GAP = 6

const errorMessage = (error: unknown): string =>
  isApiErrorKind(error, 'PUZZLE_ALREADY_ACTIVE')
    ? '맞추는 중인 퍼즐이 이미 있어요'
    : isApiErrorKind(error, 'NOT_FOUND')
      ? '고른 사진을 찾을 수 없어요. 다른 사진을 골라 주세요'
      : '퍼즐을 시작하지 못했어요. 잠시 후 다시 시도해 주세요'

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'))

// SCR-19b 새 퍼즐: 기간(= 조각 수)과 퍼즐판 사진을 고른다. 시작일은 오늘
const PuzzleStartScreen = () => {
  const insets = useSafeAreaInsets()
  const frameWidth = useFrameWidth()
  const now = useNow(MINUTE_MS)
  const today = toKstDate(now)
  const anniversaries = useAnniversaries()
  const photos = usePhotos()
  const create = useCreatePuzzle()
  const toast = useToast()
  const [isBlocked, setIsBlocked] = useState(false)
  const next = anniversaries.data ? findNextAnniversary(anniversaries.data, now) : null
  const options = periodOptions(today, next)
  const [periodKey, setPeriodKey] = useState('100')
  const period = options.find((option) => option.key === periodKey) ?? options[0]
  const photoList = (photos.data?.pages ?? []).flatMap((page) => page.items).filter((photo) => photo.displayUrl)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const backgroundId = pickedId ?? photoList[0]?.id ?? null
  const tile = (frameWidth - SPACING.screen * 2 - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS

  const handleStart = () => {
    if (!backgroundId || create.isPending) return
    create.mutate(
      { backgroundPhotoId: backgroundId, pieceCount: period.pieceCount },
      {
        onSuccess: leave,
        onError: (error) =>
          isApiErrorKind(error, 'COUPLE_UNLINKING') ? setIsBlocked(true) : toast.show(errorMessage(error)),
      },
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="새 퍼즐" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.intro}>
          <AppText variant="title">하루가 한 조각이 돼요</AppText>
          <AppText variant="label" color="ink2">
            정한 기간의 날 수만큼 조각이 생기고, 그날 올린 사진이 그날 칸에 놓여요.
          </AppText>
        </View>

        <AppText variant="bodyStrong">얼마 동안 맞출까요?</AppText>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {options.map((option) => {
            const isPicked = option.key === period.key
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: isPicked }}
                accessibilityLabel={`${option.label} · ${option.pieceCount}조각`}
                onPress={() => setPeriodKey(option.key)}
                style={[styles.option, isPicked && styles.optionPicked]}
              >
                <AppText variant="bodyStrong">{`${option.label} · ${option.pieceCount}조각`}</AppText>
                <AppText variant="caption" color="ink3">
                  {`${formatDotDate(puzzleEndsOn(today, option.pieceCount))} 완성`}
                </AppText>
              </Pressable>
            )
          })}
        </View>

        <AppText variant="bodyStrong">퍼즐판 사진</AppText>
        {photos.isSuccess && photoList.length === 0 ? (
          <View style={styles.noPhoto}>
            <AppText variant="label" color="ink2">
              아직 올린 사진이 없어요. 기록에 사진을 먼저 올려 주세요
            </AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {photoList.map((photo) => {
              const isPicked = photo.id === backgroundId
              return (
                <Pressable
                  key={photo.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isPicked }}
                  accessibilityLabel="퍼즐판 사진"
                  onPress={() => setPickedId(photo.id)}
                  style={[{ width: tile, height: tile }, styles.tile, isPicked && styles.tilePicked]}
                >
                  <Image source={{ uri: photo.thumbUrl ?? photo.displayUrl ?? undefined }} style={styles.image} />
                  {isPicked ? (
                    <View style={styles.check}>
                      <Icon name="check" size={14} color="bg" />
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        )}
        {photos.hasNextPage ? (
          <Button
            label="사진 더 보기"
            variant="outline"
            size="md"
            isLoading={photos.isFetchingNextPage}
            onPress={() => photos.fetchNextPage()}
          />
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING[4] }]}>
        <Button label="퍼즐 시작하기" isLoading={create.isPending} disabled={!backgroundId} onPress={handleStart} />
      </View>
      <UnlinkingBlockedSheet
        isVisible={isBlocked}
        onClose={() => setIsBlocked(false)}
        onOpenStatus={() => router.push('/settings')}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING[6], gap: SPACING[4] },
  intro: { gap: SPACING[2], paddingTop: SPACING[2] },
  options: { gap: SPACING[2] },
  option: {
    minHeight: TOUCH_TARGET,
    gap: 2,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionPicked: { borderColor: COLORS.accent, backgroundColor: COLORS.blush },
  noPhoto: { padding: SPACING[4], borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: PHOTO_GAP },
  tile: { borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: COLORS.surface },
  tilePicked: { borderWidth: 3, borderColor: COLORS.accent },
  image: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  footer: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[3] },
})

export default PuzzleStartScreen
