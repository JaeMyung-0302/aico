import Phaser from 'phaser'
import type { GridPosition } from '@/types'

const GRID_SIZE = 5

// ADR-5: 13 경로 셀, 12 배치 셀
// row0: P P P P .
// row1: . . . P .
// row2: . P P P .
// row3: . P . . .
// row4: . P P P P
const PATH_CELLS: GridPosition[] = [
  { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
  { row: 1, col: 3 },
  { row: 2, col: 3 }, { row: 2, col: 2 }, { row: 2, col: 1 },
  { row: 3, col: 1 },
  { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 },
]

// 경로 그리드 좌표 반환 (GridManager 연동용)
export const getPathGridPositions = (): GridPosition[] => [...PATH_CELLS]

// 경로 생성: 좌상단 진입 → Z자형 → 우하단 퇴장
export const generateSPath = (
  gridStartX: number,
  gridStartY: number,
  slotSize: number,
): Phaser.Math.Vector2[] => {
  const path: Phaser.Math.Vector2[] = []
  const halfSlot = slotSize / 2

  // 입구 (첫 셀 위)
  const entry = PATH_CELLS[0]!
  path.push(new Phaser.Math.Vector2(
    gridStartX + entry.col * slotSize + halfSlot,
    gridStartY - slotSize,
  ))

  // 경로 셀 순회
  for (const cell of PATH_CELLS) {
    const x = gridStartX + cell.col * slotSize + halfSlot
    const y = gridStartY + cell.row * slotSize + halfSlot
    path.push(new Phaser.Math.Vector2(x, y))
  }

  // 출구 (마지막 셀 아래)
  const exit = PATH_CELLS[PATH_CELLS.length - 1]!
  path.push(new Phaser.Math.Vector2(
    gridStartX + exit.col * slotSize + halfSlot,
    gridStartY + GRID_SIZE * slotSize + slotSize,
  ))

  return path
}

// L자 경로: 좌상단 → 우상단 → 우하단
export const generateLPath = (
  gridStartX: number,
  gridStartY: number,
  slotSize: number,
): Phaser.Math.Vector2[] => {
  const path: Phaser.Math.Vector2[] = []
  const halfSlot = slotSize / 2

  // 입구
  path.push(new Phaser.Math.Vector2(gridStartX - slotSize, gridStartY + halfSlot))

  // 상단 가로 이동 (좌→우)
  for (let col = 0; col < GRID_SIZE; col++) {
    const x = gridStartX + col * slotSize + halfSlot
    const y = gridStartY + halfSlot
    path.push(new Phaser.Math.Vector2(x, y))
  }

  // 우측 세로 이동 (상→하)
  for (let row = 1; row < GRID_SIZE; row++) {
    const x = gridStartX + (GRID_SIZE - 1) * slotSize + halfSlot
    const y = gridStartY + row * slotSize + halfSlot
    path.push(new Phaser.Math.Vector2(x, y))
  }

  // 출구
  path.push(new Phaser.Math.Vector2(
    gridStartX + (GRID_SIZE - 1) * slotSize + halfSlot,
    gridStartY + GRID_SIZE * slotSize + slotSize,
  ))

  return path
}

// 경로 시각화 (디버그용)
export const drawPath = (
  scene: Phaser.Scene,
  path: Phaser.Math.Vector2[],
  color: number = 0x666666,
): Phaser.GameObjects.Graphics => {
  const graphics = scene.add.graphics()
  graphics.lineStyle(2, color, 0.3)

  if (path.length < 2) return graphics

  const first = path[0]!
  graphics.beginPath()
  graphics.moveTo(first.x, first.y)

  for (let i = 1; i < path.length; i++) {
    const point = path[i]!
    graphics.lineTo(point.x, point.y)
  }

  graphics.strokePath()
  return graphics
}
