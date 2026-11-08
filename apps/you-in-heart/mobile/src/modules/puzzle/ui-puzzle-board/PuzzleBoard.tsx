import { useId, useMemo } from 'react'
import { type GestureResponderEvent, Pressable } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Path, Rect } from 'react-native-svg'
import { COLORS } from '@/design-system/tokens/colors'
import { cellAt, layoutPuzzle, piecePath, seamsPath } from '../util-puzzle/jigsaw-layout'
import type { PuzzleView } from '../util-puzzle/puzzle-view'

type PuzzleBoardProps = {
  pieceCount: number
  backgroundUrl: string | null
  view: Pick<PuzzleView, 'pieceByIndex' | 'elapsed' | 'todayIndex' | 'isComplete'>
  width: number
  height: number
  // 칸을 누르면 그 칸 번호(날짜 순). 없으면 누를 수 없는 판
  onCellPress?: (index: number) => void
  // 강조할 칸(지난 날 채우기에서 고른 날). 없으면 오늘 칸
  highlightIndex?: number | null
}

// 볼록한 부분까지 덮도록 조각 사진을 칸보다 넉넉하게 놓는다
const PIECE_BLEED = 0.25
const VEIL_OPACITY = 0.45
const FUTURE_VEIL_OPACITY = 0.5

type BoxOrigin = { left: number; top: number }
type WebMouse = { clientX?: number; clientY?: number }

const hasRect = (value: unknown): value is { getBoundingClientRect: () => BoxOrigin } =>
  typeof value === 'object' && value !== null && 'getBoundingClientRect' in value

// 네이티브는 locationX/Y. 웹(react-native-web 클릭)은 locationX가 NaN이라 clientX/Y − 판 위치로 계산한다
const pressPoint = (event: GestureResponderEvent): { x: number; y: number } => {
  const native: GestureResponderEvent['nativeEvent'] & WebMouse = event.nativeEvent
  if (Number.isFinite(native.locationX) && Number.isFinite(native.locationY)) {
    return { x: native.locationX, y: native.locationY }
  }
  const target: unknown = event.currentTarget
  if (!hasRect(target) || native.clientX === undefined || native.clientY === undefined) {
    return { x: Number.NaN, y: Number.NaN }
  }
  const rect = target.getBoundingClientRect()
  return { x: native.clientX - rect.left, y: native.clientY - rect.top }
}

// SCR-19 공용 퍼즐판: 퍼즐판 사진(배경) 위에 하루 한 조각씩 그 날의 사진이 놓인다.
// 빈 지난 날은 분홍 점, 오늘(또는 고른 날)은 분홍 테두리, 아직 오지 않은 날은 더 옅게.
// 완성하면 덮개를 걷어 빈 날은 퍼즐판 사진 그대로 보인다(SCR-19d)
const PuzzleBoard = ({
  pieceCount,
  backgroundUrl,
  view,
  width,
  height,
  onCellPress,
  highlightIndex,
}: PuzzleBoardProps) => {
  const idPrefix = `pz${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const layout = useMemo(() => layoutPuzzle(pieceCount, width, height), [pieceCount, width, height])
  const seams = useMemo(() => seamsPath(layout), [layout])
  const ringIndex = highlightIndex ?? view.todayIndex
  const isSmall = Math.min(width / layout.cols, layout.cellH) < 20
  const pieces = [...view.pieceByIndex.values()].filter((piece) => layout.cells[piece.dayIndex])
  const emptyPast = view.isComplete
    ? []
    : layout.cells.filter(
        (cell) => cell.index < view.elapsed && cell.index !== ringIndex && !view.pieceByIndex.has(cell.index),
      )
  const future = view.isComplete
    ? ''
    : layout.cells
        .filter((cell) => cell.index >= view.elapsed)
        .map((cell) => piecePath(layout, cell.index))
        .join('')

  const handlePress = (event: GestureResponderEvent) => {
    const { x, y } = pressPoint(event)
    const index = cellAt(layout, x, y)
    if (index !== null) onCellPress?.(index)
  }

  return (
    <Pressable
      disabled={!onCellPress}
      onPress={handlePress}
      accessibilityRole={onCellPress ? 'button' : 'image'}
      accessibilityLabel={
        view.isComplete
          ? `${pieceCount}조각 퍼즐 완성`
          : `${pieceCount}조각 중 ${view.pieceByIndex.size}조각이 놓인 퍼즐`
      }
      style={{ width, height }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {pieces.map((piece) => (
            <ClipPath key={piece.dayIndex} id={`${idPrefix}-${piece.dayIndex}`}>
              <Path d={piecePath(layout, piece.dayIndex)} />
            </ClipPath>
          ))}
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={COLORS.surface} />
        {backgroundUrl ? (
          <SvgImage
            href={backgroundUrl}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : null}
        {view.isComplete ? null : (
          <Rect x={0} y={0} width={width} height={height} fill={COLORS.bg} opacity={VEIL_OPACITY} />
        )}
        {future ? <Path d={future} fill={COLORS.bg} opacity={FUTURE_VEIL_OPACITY} /> : null}
        {pieces.map((piece) => {
          const cell = layout.cells[piece.dayIndex]
          const bleed = PIECE_BLEED * Math.min(cell.w, cell.h)
          return (
            <G key={piece.dayIndex} clipPath={`url(#${idPrefix}-${piece.dayIndex})`}>
              <SvgImage
                href={piece.thumbUrl}
                x={cell.x - bleed}
                y={cell.y - bleed}
                width={cell.w + bleed * 2}
                height={cell.h + bleed * 2}
                preserveAspectRatio="xMidYMid slice"
              />
            </G>
          )
        })}
        <Path d={seams} fill="none" stroke={COLORS.bg} strokeOpacity={0.85} strokeWidth={isSmall ? 0.5 : 1.2} />
        {emptyPast.map((cell) => (
          <Circle
            key={cell.index}
            cx={cell.x + cell.w / 2}
            cy={cell.y + cell.h / 2}
            r={Math.max(1.2, Math.min(cell.w, cell.h) * 0.07)}
            fill={COLORS.accent}
          />
        ))}
        {ringIndex !== null && ringIndex !== undefined && layout.cells[ringIndex] ? (
          <Path d={piecePath(layout, ringIndex)} fill="none" stroke={COLORS.accent} strokeWidth={isSmall ? 1.2 : 2} />
        ) : null}
      </Svg>
    </Pressable>
  )
}

export default PuzzleBoard
