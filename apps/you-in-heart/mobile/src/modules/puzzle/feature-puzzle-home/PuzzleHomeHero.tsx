import { type PuzzleDetail, toKstDate } from '@you-in-heart/shared'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useFrameWidth } from '@/design-system/components/AppFrame'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'
import PuzzleBoard from '../ui-puzzle-board/PuzzleBoard'
import { describePuzzle } from '../util-puzzle/puzzle-view'

// 시안 SCR-19a 390×480 비율
const HERO_RATIO = 480 / 390

type PuzzleHomeHeroProps = {
  puzzle: PuzzleDetail
  nowMs: number
  topInset: number
  // 퍼즐판 위에 겹치는 상단(이름 · 설정)
  header: ReactNode
}

// SCR-19a 홈 첫 화면: 맞추는 중인 퍼즐판이 화면 폭 가득, 아래에 기간 카드와 지난 날 채우기 안내
const PuzzleHomeHero = ({ puzzle, nowMs, topInset, header }: PuzzleHomeHeroProps) => {
  const width = useFrameWidth()
  const view = describePuzzle(puzzle, toKstDate(nowMs))
  const openPuzzle = () => router.push({ pathname: '/puzzle/[puzzleId]', params: { puzzleId: puzzle.id } })
  return (
    <View>
      <PuzzleBoard
        pieceCount={puzzle.pieceCount}
        backgroundUrl={puzzle.backgroundUrl}
        view={view}
        width={width}
        height={Math.round(width * HERO_RATIO)}
        onCellPress={openPuzzle}
      />
      <View style={[styles.header, { paddingTop: topInset + SPACING[2] }]} pointerEvents="box-none">
        {header}
      </View>
      <View style={styles.cards}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${view.title} ${view.ddayLabel}, ${formatDotDate(puzzle.endsOn)} 완성`}
          onPress={() => router.push('/puzzle')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.texts}>
            <AppText variant="micro" color="ink3">
              {view.title} · {puzzle.filledCount} / {puzzle.pieceCount}조각
            </AppText>
            <AppText variant="bodyStrong">{formatDotDate(puzzle.endsOn)} 완성</AppText>
          </View>
          <AppText variant="title" color="accent">
            {view.ddayLabel}
          </AppText>
        </Pressable>
        {view.emptyPastCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={openPuzzle}
            style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
          >
            <View style={styles.dot} />
            <AppText variant="label" color="ink2" style={styles.fillText}>
              비어 있는 지난 날 <AppText variant="labelStrong">{view.emptyPastCount}일</AppText> · 그날 사진으로 채우기
            </AppText>
            <Icon name="chevronRight" size={16} color="ink3" />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

// 퍼즐이 없을 때 홈의 시작 카드(SCR-19b로)
export const PuzzleStartCard = () => (
  <Pressable
    accessibilityRole="button"
    onPress={() => router.push('/puzzle/new')}
    style={({ pressed }) => [styles.start, pressed && styles.pressed]}
  >
    <View style={styles.texts}>
      <AppText variant="bodyStrong">우리 퍼즐 시작하기</AppText>
      <AppText variant="caption" color="ink2">
        하루가 한 조각이 돼요. 사진 한 장을 퍼즐판으로 골라요
      </AppText>
    </View>
    <Icon name="chevronRight" size={18} color="ink3" />
  </Pressable>
)

const styles = StyleSheet.create({
  // 퍼즐판 위에서도 이름·설정이 읽히도록 옅은 덮개
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: SPACING.screen,
    backgroundColor: COLORS.photoVeil,
  },
  cards: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[4], gap: SPACING[3] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[4],
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  texts: { flex: 1, gap: 2 },
  fill: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  fillText: { flex: 1 },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[4],
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.blush,
  },
  pressed: { opacity: 0.7 },
})

export default PuzzleHomeHero
