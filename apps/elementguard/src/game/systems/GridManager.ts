import Phaser from 'phaser'
import type { GridPosition, TerrainType } from '@/types'
import { GridSlot } from '@/game/entities/GridSlot'
import type { TerrainTile } from '@/game/systems/TerrainSystem'

const GRID_SIZE = 5

export class GridManager {
  private scene: Phaser.Scene
  private slots: GridSlot[][] = []
  private slotSize: number
  private gridStartX: number
  private gridStartY: number

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    // 반응형: 화면 크기에 맞춰 그리드 사이즈 계산
    const { width, height } = scene.scale
    const maxGridWidth = width * 0.9
    const maxGridHeight = height * 0.6
    this.slotSize = Math.floor(Math.min(maxGridWidth, maxGridHeight) / GRID_SIZE)

    const gridTotalWidth = this.slotSize * GRID_SIZE
    const gridTotalHeight = this.slotSize * GRID_SIZE
    this.gridStartX = (width - gridTotalWidth) / 2
    this.gridStartY = height * 0.15 // 상단 15% 여백 (HUD 영역)
  }

  createGrid(terrains: TerrainTile[] = []) {
    for (let row = 0; row < GRID_SIZE; row++) {
      this.slots[row] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = this.gridStartX + col * this.slotSize + this.slotSize / 2
        const y = this.gridStartY + row * this.slotSize + this.slotSize / 2
        const slot = new GridSlot(this.scene, x, y, { row, col }, this.slotSize)
        this.slots[row]![col] = slot
      }
    }

    // 지형 배치
    for (const terrain of terrains) {
      const slot = this.getSlot(terrain.position)
      slot?.setTerrain(terrain.type)
    }
  }

  getSlot(pos: GridPosition): GridSlot | undefined {
    return this.slots[pos.row]?.[pos.col]
  }

  getSlotWorldPosition(pos: GridPosition): { x: number; y: number } | undefined {
    const slot = this.getSlot(pos)
    if (!slot) return undefined
    return { x: slot.x, y: slot.y }
  }

  getGridPositionFromWorld(worldX: number, worldY: number): GridPosition | undefined {
    const col = Math.floor((worldX - this.gridStartX) / this.slotSize)
    const row = Math.floor((worldY - this.gridStartY) / this.slotSize)

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return undefined
    return { row, col }
  }

  getSlotSize(): number {
    return this.slotSize
  }

  getGridStart(): { x: number; y: number } {
    return { x: this.gridStartX, y: this.gridStartY }
  }

  // 인접 슬롯 조회
  getAdjacentSlots(pos: GridPosition): GridSlot[] {
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ]

    const adjacent: GridSlot[] = []
    for (const d of directions) {
      const slot = this.getSlot({ row: pos.row + d.row, col: pos.col + d.col })
      if (slot) adjacent.push(slot)
    }
    return adjacent
  }

  // 경로 셀 설정
  setPathCells(positions: GridPosition[]) {
    for (const pos of positions) {
      const slot = this.getSlot(pos)
      slot?.setPathCell()
    }
  }

  // 모든 하이라이트 제거
  clearAllHighlights() {
    for (const row of this.slots) {
      for (const slot of row) {
        slot.hideHighlight()
      }
    }
  }

  // 빈 슬롯 목록 (경로 셀 + 점유 셀 제외)
  getEmptySlots(occupiedPositions: GridPosition[]): GridSlot[] {
    const result: GridSlot[] = []
    for (const row of this.slots) {
      for (const slot of row) {
        if (slot.isPathCell) continue
        const isOccupied = occupiedPositions.some(
          (p) => p.row === slot.gridPos.row && p.col === slot.gridPos.col,
        )
        if (!isOccupied) result.push(slot)
      }
    }
    return result
  }

  destroy() {
    for (const row of this.slots) {
      for (const slot of row) {
        slot.destroy()
      }
    }
    this.slots = []
  }
}
