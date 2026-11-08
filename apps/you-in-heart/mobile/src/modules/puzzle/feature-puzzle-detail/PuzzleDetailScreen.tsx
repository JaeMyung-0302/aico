import { puzzleDayDate, toKstDate } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useFrameWidth } from '@/design-system/components/AppFrame'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Dialog from '@/design-system/components/Dialog'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useNow } from '@/shared/hooks/use-now'
import { useToast } from '@/shared/hooks/use-toast'
import { useDeletePuzzle, usePuzzle } from '../data-access-puzzle/usePuzzles'
import PuzzleBoard from '../ui-puzzle-board/PuzzleBoard'
import { describePuzzle, type PuzzleView } from '../util-puzzle/puzzle-view'

const MINUTE_MS = 60_000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

// '2026-10-03' → '10월 3일 토요일'
const formatDayTitle = (ymd: string): string => {
  const [, month, day] = ymd.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()]
  return `${month}월 ${day}일 ${weekday}요일`
}
const formatMonthDay = (ymd: string): string => {
  const [, month, day] = ymd.split('-').map(Number)
  return `${month}월 ${day}일`
}

type SelectedDayProps = { startsOn: string; index: number; today: string; view: PuzzleView }

// 고른 칸: 채운 날 = 그 기록 사진과 기록 열기(SCR-19e), 빈 지난 날·오늘 = 그날 사진으로 채우기(SCR-19h)
const SelectedDay = ({ startsOn, index, today, view }: SelectedDayProps) => {
  const date = puzzleDayDate(startsOn, index)
  const piece = view.pieceByIndex.get(index)
  return (
    <View style={styles.selected}>
      <View style={styles.selectedTexts}>
        <AppText variant="bodyStrong">{formatDayTitle(date)}</AppText>
        <AppText variant="caption" color="ink3">{`${index + 1}번째 날`}</AppText>
      </View>
      {piece ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatMonthDay(date)} 기록 보기`}
          onPress={() => router.push({ pathname: '/diary/[entryId]', params: { entryId: piece.entryId } })}
          style={({ pressed }) => [styles.pieceRow, pressed && styles.pressed]}
        >
          <Image source={{ uri: piece.thumbUrl }} style={styles.pieceThumb} />
          <AppText variant="labelStrong" style={styles.flex}>
            이 조각을 채운 기록 보기
          </AppText>
          <Icon name="chevronRight" size={18} color="ink3" />
        </Pressable>
      ) : date <= today ? (
        <Button
          label={`${formatMonthDay(date)} 조각 놓기`}
          onPress={() => router.push({ pathname: '/diary/new', params: { date } })}
        />
      ) : (
        <AppText variant="label" color="ink3">
          아직 오지 않은 날이에요
        </AppText>
      )}
    </View>
  )
}

// SCR-19e·19h·19d 퍼즐 크게 보기: 칸을 눌러 그 날의 조각을 보거나 빈 날을 채운다. 기간이 끝나면 완성 화면
const PuzzleDetailScreen = ({ puzzleId }: { puzzleId: string }) => {
  const width = useFrameWidth() - SPACING.screen * 2
  const today = toKstDate(useNow(MINUTE_MS))
  const puzzle = usePuzzle(puzzleId)
  const remove = useDeletePuzzle()
  const toast = useToast()
  const [picked, setPicked] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!puzzle.data) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        {puzzle.isError ? (
          <EmptyLayout icon="alert" title="퍼즐을 불러오지 못했어요" onRetry={() => puzzle.refetch()} />
        ) : null}
      </View>
    )
  }

  const data = puzzle.data
  const view = describePuzzle(data, today)
  const selected = picked ?? view.todayIndex
  const handleDelete = () =>
    remove.mutate(data.id, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/')),
      onError: () => toast.show('퍼즐을 지우지 못했어요. 잠시 후 다시 시도해 주세요'),
    })

  return (
    <View style={styles.screen}>
      <AppHeader
        title={view.title}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="퍼즐 지우기"
            onPress={() => setIsDeleting(true)}
            style={styles.headerAction}
          >
            <Icon name="trash" size={20} color="ink2" />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        {view.isComplete ? (
          <View style={styles.intro}>
            <AppText variant="title">퍼즐을 다 맞췄어요</AppText>
            <AppText variant="label" color="ink2">
              {`${data.pieceCount}일 중 ${data.filledCount}일을 사진으로 채웠어요. 조각을 누르면 그 기록이 열려요.`}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" color="ink2">
            분홍 점이 있는 칸이 비어 있는 지난 날이에요. 칸을 눌러 골라요
          </AppText>
        )}
        <PuzzleBoard
          pieceCount={data.pieceCount}
          backgroundUrl={data.backgroundUrl}
          view={view}
          width={width}
          height={width}
          highlightIndex={selected}
          onCellPress={setPicked}
        />
        {selected !== null ? <SelectedDay startsOn={data.startsOn} index={selected} today={today} view={view} /> : null}
      </ScrollView>
      <Dialog
        isVisible={isDeleting}
        onClose={() => setIsDeleting(false)}
        title="이 퍼즐을 지울까요?"
        description="조각이 된 기록과 사진은 그대로 남아요."
        actions={
          <>
            <Button label="취소" variant="outline" size="md" onPress={() => setIsDeleting(false)} style={styles.flex} />
            <Button
              label="지우기"
              variant="danger"
              size="md"
              isLoading={remove.isPending}
              onPress={handleDelete}
              style={styles.flex}
            />
          </>
        }
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING[8], gap: SPACING[4] },
  intro: { gap: SPACING[2] },
  headerAction: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  selected: { gap: SPACING[3] },
  selectedTexts: { gap: 2 },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  pieceThumb: { width: 56, height: 56, borderRadius: RADIUS.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
})

export default PuzzleDetailScreen
