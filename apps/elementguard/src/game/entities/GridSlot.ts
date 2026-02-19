import Phaser from 'phaser'
import type { GridPosition, TerrainType } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'

export class GridSlot extends Phaser.GameObjects.Container {
  readonly gridPos: GridPosition
  private background: Phaser.GameObjects.Image
  private terrainOverlay: Phaser.GameObjects.Image | null = null
  private highlight: Phaser.GameObjects.Rectangle | null = null
  private pathOverlay: Phaser.GameObjects.Image | null = null
  occupied = false
  isPathCell = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gridPos: GridPosition,
    slotSize: number,
  ) {
    super(scene, x, y)
    this.gridPos = gridPos

    // 배경 슬롯
    this.background = scene.add.image(0, 0, TEXTURE_KEYS.gridSlot)
    this.background.setDisplaySize(slotSize, slotSize)
    this.add(this.background)

    // 인터랙티브 영역
    this.setSize(slotSize, slotSize)
    this.setInteractive({ dropZone: true })

    scene.add.existing(this)
  }

  setPathCell() {
    if (this.isPathCell) return
    this.isPathCell = true
    this.disableInteractive()
    if (this.terrainOverlay) {
      this.terrainOverlay.destroy()
      this.terrainOverlay = null
    }
    this.pathOverlay = this.scene.add.image(0, 0, TEXTURE_KEYS.pathTile)
    this.pathOverlay.setDisplaySize(this.width, this.height)
    this.addAt(this.pathOverlay, 1)
  }

  setTerrain(terrainType: TerrainType) {
    if (this.terrainOverlay) {
      this.terrainOverlay.destroy()
    }
    this.terrainOverlay = this.scene.add.image(0, 0, TEXTURE_KEYS.terrain(terrainType))
    this.terrainOverlay.setDisplaySize(this.width, this.height)
    this.addAt(this.terrainOverlay, 1)
  }

  showHighlight(color: number = 0x44ff88) {
    if (!this.highlight) {
      this.highlight = this.scene.add.rectangle(0, 0, this.width - 4, this.height - 4, color, 0.3)
      this.add(this.highlight)
    }
    this.highlight.setFillStyle(color, 0.3)
    this.highlight.setVisible(true)
  }

  hideHighlight() {
    this.highlight?.setVisible(false)
  }

  destroy(fromScene?: boolean) {
    this.pathOverlay?.destroy()
    this.terrainOverlay?.destroy()
    this.highlight?.destroy()
    super.destroy(fromScene)
  }
}
