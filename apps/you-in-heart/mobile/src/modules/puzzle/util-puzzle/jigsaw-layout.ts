// SCR-19 퍼즐판 배치. 하루 = 한 칸, 0번(시작일)이 왼쪽 위이고 줄마다 왼쪽→오른쪽.
// 조각 수에 딱 맞는 열 수를 고르고, 남는 조각은 마지막 줄을 넓게 나눠 판 전체를 덮는다

export type PuzzleCell = { index: number; row: number; col: number; x: number; y: number; w: number; h: number }

export type PuzzleLayout = {
  width: number
  height: number
  cols: number
  rows: number
  cellH: number
  // 마지막 줄 칸 수(가득 차면 cols)
  lastRowCols: number
  cells: PuzzleCell[]
}

// 볼록·오목 크기(칸 짧은 변 대비)
const TAB_RATIO = 0.2
const COL_SEARCH = 3

const rowColsOf = (layout: Pick<PuzzleLayout, 'rows' | 'cols' | 'lastRowCols'>, row: number): number =>
  row === layout.rows - 1 ? layout.lastRowCols : layout.cols

const pickCols = (count: number, width: number, height: number): number => {
  const ideal = Math.max(1, Math.round(Math.sqrt((count * width) / height)))
  const candidates = Array.from({ length: COL_SEARCH * 2 + 1 }, (_, i) => ideal - COL_SEARCH + i).filter(
    (cols) => cols >= 1 && cols <= count,
  )
  const score = (cols: number) => (Math.ceil(count / cols) * cols - count) * 10 + Math.abs(cols - ideal)
  return candidates.reduce((best, cols) => (score(cols) < score(best) ? cols : best), candidates[0] ?? 1)
}

export const layoutPuzzle = (count: number, width: number, height: number): PuzzleLayout => {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`잘못된 조각 수: ${count}`)
  if (!(width > 0) || !(height > 0)) throw new RangeError(`잘못된 판 크기: ${width}x${height}`)
  const cols = pickCols(count, width, height)
  const rows = Math.ceil(count / cols)
  const lastRowCols = count - cols * (rows - 1)
  const cellH = height / rows
  const cells = Array.from({ length: count }, (_, index): PuzzleCell => {
    const row = Math.floor(index / cols)
    const col = index - row * cols
    const w = width / (row === rows - 1 ? lastRowCols : cols)
    return { index, row, col, x: col * w, y: row * cellH, w, h: cellH }
  })
  return { width, height, cols, rows, cellH, lastRowCols, cells }
}

// 같은 경계는 양쪽 조각이 같은 방향(볼록/오목)을 보도록 경계 번호로만 정한다
const edgeSign = (key: number): 1 | -1 => (((Math.imul(key + 7, 2654435761) >>> 0) % 1000) % 2 ? 1 : -1)

const f = (value: number): string => value.toFixed(2)

type Point = [number, number]
// 한 변 = 직선 · 3차 곡선(볼록·오목) · 직선. 끝점만 빼고 L·C 명령으로 이어 붙인다
type Edge = { segments: string; reversed: string }

const tabEdge = (from: Point, to: Point, bump: Point): Edge => {
  const at = (t: number, lift: number): Point => [
    from[0] + (to[0] - from[0]) * t + bump[0] * lift,
    from[1] + (to[1] - from[1]) * t + bump[1] * lift,
  ]
  const p = (point: Point) => `${f(point[0])} ${f(point[1])}`
  const [a, c1, c2, b] = [at(0.36, 0), at(0.26, 1), at(0.74, 1), at(0.64, 0)]
  return {
    segments: `L${p(a)}C${p(c1)} ${p(c2)} ${p(b)}L${p(to)}`,
    // 3차 곡선을 거꾸로 = 끝점·제어점 순서를 뒤집는다
    reversed: `L${p(b)}C${p(c2)} ${p(c1)} ${p(a)}L${p(from)}`,
  }
}

const flatEdge = (from: Point, to: Point): Edge => ({
  segments: `L${f(to[0])} ${f(to[1])}`,
  reversed: `L${f(from[0])} ${f(from[1])}`,
})

// 칸 위쪽 경계. 첫 줄과 "모자란 마지막 줄의 위"(위아래 칸 폭이 달라 맞물리지 않는다)는 평평
const topEdge = (layout: PuzzleLayout, cell: PuzzleCell): Edge => {
  const from: Point = [cell.x, cell.y]
  const to: Point = [cell.x + cell.w, cell.y]
  const isFlat = cell.row === 0 || rowColsOf(layout, cell.row) !== rowColsOf(layout, cell.row - 1)
  if (isFlat) return flatEdge(from, to)
  const lift = edgeSign(cell.row * 97 + cell.col * 13 + 1) * TAB_RATIO * Math.min(cell.w, cell.h)
  return tabEdge(from, to, [0, lift])
}

// 칸 왼쪽 경계. 첫 열은 평평
const leftEdge = (cell: PuzzleCell): Edge => {
  const from: Point = [cell.x, cell.y]
  const to: Point = [cell.x, cell.y + cell.h]
  if (cell.col === 0) return flatEdge(from, to)
  const lift = edgeSign(cell.row * 31 + cell.col * 71 + 2) * TAB_RATIO * Math.min(cell.w, cell.h)
  return tabEdge(from, to, [lift, 0])
}

const below = (layout: PuzzleLayout, cell: PuzzleCell): PuzzleCell | undefined =>
  cell.row < layout.rows - 1 && rowColsOf(layout, cell.row + 1) === rowColsOf(layout, cell.row)
    ? layout.cells[cell.index + layout.cols]
    : undefined

const rightOf = (layout: PuzzleLayout, cell: PuzzleCell): PuzzleCell | undefined =>
  cell.col < rowColsOf(layout, cell.row) - 1 ? layout.cells[cell.index + 1] : undefined

// 조각 하나의 닫힌 경로(시계 방향: 위 → 오른쪽 → 아래 → 왼쪽). 이웃의 경계를 그대로 써서 정확히 맞물린다
export const piecePath = (layout: PuzzleLayout, index: number): string => {
  const cell = layout.cells[index]
  if (!cell) return ''
  const right = rightOf(layout, cell)
  const down = below(layout, cell)
  const top = topEdge(layout, cell)
  const rightSide = right
    ? leftEdge(right).segments
    : flatEdge([cell.x + cell.w, cell.y], [cell.x + cell.w, cell.y + cell.h]).segments
  const bottom = down
    ? topEdge(layout, down).reversed
    : flatEdge([cell.x, cell.y + cell.h], [cell.x + cell.w, cell.y + cell.h]).reversed
  return `M${f(cell.x)} ${f(cell.y)}${top.segments}${rightSide}${bottom}${leftEdge(cell).reversed}Z`
}

// 판 안쪽 경계선 전체(이음매). 한 Path로 그린다
export const seamsPath = (layout: PuzzleLayout): string =>
  layout.cells
    .flatMap((cell) => [
      cell.row > 0 ? `M${f(cell.x)} ${f(cell.y)}${topEdge(layout, cell).segments}` : '',
      cell.col > 0 ? `M${f(cell.x)} ${f(cell.y)}${leftEdge(cell).segments}` : '',
    ])
    .join('')

// 누른 좌표의 칸 번호(판 밖이면 null). 볼록한 부분은 무시하고 칸 사각형으로 판단한다
export const cellAt = (layout: PuzzleLayout, x: number, y: number): number | null => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return null
  const row = Math.min(layout.rows - 1, Math.floor(y / layout.cellH))
  const cols = rowColsOf(layout, row)
  const col = Math.min(cols - 1, Math.floor(x / (layout.width / cols)))
  return row * layout.cols + col
}
