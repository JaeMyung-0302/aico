import { cellAt, layoutPuzzle, piecePath } from '../util-puzzle/jigsaw-layout'

// 경로의 모든 좌표(x y 쌍)를 꺼낸다
const points = (path: string): [number, number][] => {
  const nums = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
  return Array.from({ length: nums.length / 2 }, (_, i) => [nums[i * 2], nums[i * 2 + 1]])
}

describe('jigsaw-layout', () => {
  it('조각 수만큼 칸을 만들고, 정사각에 가까운 열 수에서 남는 칸이 가장 적은 배치를 고른다', () => {
    const square = layoutPuzzle(100, 300, 300)
    expect(square.cells).toHaveLength(100)
    expect(square.cols).toBe(10)
    expect(square.rows).toBe(10)

    const year = layoutPuzzle(365, 300, 300)
    expect(year.cells).toHaveLength(365)
    expect(year.rows * year.cols - 365).toBeLessThan(year.cols)
  })

  it('칸들은 판 전체를 빈틈없이 덮는다(마지막 줄이 모자라면 넓게)', () => {
    const layout = layoutPuzzle(10, 120, 120)
    const area = layout.cells.reduce((sum, cell) => sum + cell.w * cell.h, 0)
    expect(area).toBeCloseTo(120 * 120, 6)
    const last = layout.cells.at(-1)
    expect(last && last.x + last.w).toBeCloseTo(120, 6)
    expect(last && last.y + last.h).toBeCloseTo(120, 6)
  })

  it('칸 번호는 날짜 순서(왼쪽 위가 0번, 줄마다 왼쪽→오른쪽)', () => {
    const layout = layoutPuzzle(9, 90, 90)
    expect(layout.cells.map(({ row, col }) => [row, col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ])
  })

  it('조각 경로는 닫혀 있고, 이웃 조각과 경계를 똑같이 나눈다(볼록·오목이 맞물림)', () => {
    const layout = layoutPuzzle(9, 90, 90)
    const left = piecePath(layout, 3)
    const right = piecePath(layout, 4)
    expect(left.startsWith('M')).toBe(true)
    expect(left.endsWith('Z')).toBe(true)
    // 3번의 오른쪽 변(x=30) 좌표 = 4번의 왼쪽 변 좌표(순서만 반대)
    const onSeam = (path: string) =>
      points(path)
        .filter(([, y]) => y > 30 && y < 60)
        .filter(([x]) => Math.abs(x - 30) < 30 * 0.25)
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .sort()
    expect(onSeam(left)).toEqual(onSeam(right))
    expect(onSeam(left).length).toBeGreaterThan(3)
  })

  it('판 가장자리 변은 평평하다', () => {
    const layout = layoutPuzzle(9, 90, 90)
    const corner = points(piecePath(layout, 0))
    expect(corner.every(([x, y]) => x >= 0 && y >= 0)).toBe(true)
  })

  it('누른 좌표의 칸 번호를 돌려준다(판 밖이면 null)', () => {
    const layout = layoutPuzzle(10, 120, 120)
    expect(cellAt(layout, 1, 1)).toBe(0)
    expect(cellAt(layout, 119, 119)).toBe(9)
    expect(cellAt(layout, -1, 5)).toBeNull()
    expect(cellAt(layout, 5, 121)).toBeNull()
    // 웹 클릭 이벤트처럼 좌표가 없으면 칸을 고르지 않는다
    expect(cellAt(layout, Number.NaN, 5)).toBeNull()
    expect(cellAt(layout, 5, Number.NaN)).toBeNull()
  })

  it('조각 수·크기가 잘못되면 RangeError', () => {
    expect(() => layoutPuzzle(0, 100, 100)).toThrow(RangeError)
    expect(() => layoutPuzzle(10, 0, 100)).toThrow(RangeError)
  })
})
