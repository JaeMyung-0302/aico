import { type PuzzleSummary, toKstDate } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFrameWidth } from '@/design-system/components/AppFrame'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'
import { useNow } from '@/shared/hooks/use-now'
import { usePuzzles } from '../data-access-puzzle/usePuzzles'
import PuzzleBoard from '../ui-puzzle-board/PuzzleBoard'
import { describePuzzle, puzzleTitle } from '../util-puzzle/puzzle-view'

const MINUTE_MS = 60_000
const CURRENT_BOARD = 88
const GRID_GAP = 14
// 완성한 퍼즐 목록은 조각을 싣지 않는다 → 퍼즐판 사진과 이음매만 보인다
const COMPLETED_VIEW = { pieceByIndex: new Map(), elapsed: 0, todayIndex: null, isComplete: true } as const

const openPuzzle = (id: string) => router.push({ pathname: '/puzzle/[puzzleId]', params: { puzzleId: id } })

const CompletedCard = ({ puzzle, size }: { puzzle: PuzzleSummary; size: number }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${puzzleTitle(puzzle.pieceCount)} ${formatDotDate(puzzle.endsOn)} 완성`}
    onPress={() => openPuzzle(puzzle.id)}
    style={[styles.completed, { width: size }]}
  >
    <View style={styles.frame}>
      <PuzzleBoard
        pieceCount={puzzle.pieceCount}
        backgroundUrl={puzzle.backgroundUrl}
        view={COMPLETED_VIEW}
        width={size - 16}
        height={size - 16}
      />
    </View>
    <AppText variant="labelStrong">{`${puzzleTitle(puzzle.pieceCount)} · ${puzzle.pieceCount}조각`}</AppText>
    <AppText variant="caption" color="ink3">{`${formatDotDate(puzzle.endsOn)} 완성`}</AppText>
  </Pressable>
)

// SCR-19f 퍼즐 보관함: 맞추는 중인 퍼즐 + 완성한 퍼즐들. 맞추는 중이 없으면 새 퍼즐 시작
const PuzzleArchiveScreen = () => {
  const insets = useSafeAreaInsets()
  const frameWidth = useFrameWidth()
  const today = toKstDate(useNow(MINUTE_MS))
  const puzzles = usePuzzles()
  const cardSize = (frameWidth - SPACING.screen * 2 - GRID_GAP) / 2

  if (!puzzles.data) {
    return (
      <View style={styles.screen}>
        <AppHeader title="우리 퍼즐" />
        {puzzles.isError ? (
          <EmptyLayout icon="alert" title="퍼즐을 불러오지 못했어요" onRetry={() => puzzles.refetch()} />
        ) : null}
      </View>
    )
  }

  const { current, completed } = puzzles.data
  const view = current ? describePuzzle(current, today) : null
  return (
    <View style={styles.screen}>
      <AppHeader title="우리 퍼즐" />
      <ScrollView contentContainerStyle={styles.body}>
        {current && view ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`맞추는 중 ${view.title}`}
            onPress={() => openPuzzle(current.id)}
            style={styles.current}
          >
            <PuzzleBoard
              pieceCount={current.pieceCount}
              backgroundUrl={current.backgroundUrl}
              view={view}
              width={CURRENT_BOARD}
              height={CURRENT_BOARD}
            />
            <View style={styles.currentTexts}>
              <AppText variant="captionStrong" color="accent">
                맞추는 중
              </AppText>
              <AppText variant="title">{view.title}</AppText>
              <AppText variant="caption" color="ink2">
                {`${current.filledCount} / ${current.pieceCount}조각 · ${view.ddayLabel}`}
              </AppText>
            </View>
          </Pressable>
        ) : null}
        <View style={styles.sectionHead}>
          <AppText variant="bodyStrong">완성한 퍼즐</AppText>
          <AppText variant="caption" color="ink3">{`${completed.length}개`}</AppText>
        </View>
        {completed.length === 0 ? (
          <AppText variant="label" color="ink3">
            기간이 끝난 퍼즐이 여기에 모여요
          </AppText>
        ) : (
          <View style={styles.grid}>
            {completed.map((puzzle) => (
              <CompletedCard key={puzzle.id} puzzle={puzzle} size={cardSize} />
            ))}
          </View>
        )}
      </ScrollView>
      {current ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING[4] }]}>
          <Button label="새 퍼즐 시작하기" onPress={() => router.push('/puzzle/new')} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[4], paddingBottom: SPACING[8], gap: SPACING[4] },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  currentTexts: { flex: 1, gap: 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: SPACING[2],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, rowGap: SPACING[5] },
  completed: { gap: SPACING[1] },
  frame: { padding: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm / 2 },
  footer: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[3] },
})

export default PuzzleArchiveScreen
