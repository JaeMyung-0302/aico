import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import type { NpcDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import { t } from '@/i18n'

const INTERACT_HINT_RANGE = GAME_CONSTANTS.TILE_SIZE * 2

export class NPC {
  readonly sprite: Phaser.GameObjects.Sprite
  private readonly label: Phaser.GameObjects.Text
  private readonly hint: Phaser.GameObjects.Text
  private readonly definition: NpcDefinition
  private destroyed = false

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, definition: NpcDefinition, _colorIndex: number) {
    this.definition = definition

    const size = GAME_CONSTANTS.TILE_SIZE
    const x = tileX * size + size / 2
    const y = tileY * size + size / 2

    const textureKey = `npc-${definition.id}`
    const key = scene.textures.exists(textureKey) ? textureKey : 'npc-default'
    this.sprite = scene.add.sprite(x, y, key)
    this.sprite.setDepth(9)

    this.label = scene.add.text(x, y - size * 0.6, t(definition.nameKey), {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 2, y: 1 },
    })
    this.label.setOrigin(0.5, 1).setDepth(11)

    this.hint = scene.add.text(x, y - size, t('ui.hint.talk'), {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 },
    })
    this.hint.setOrigin(0.5, 1).setDepth(12).setVisible(false)
  }

  getDefinition(): NpcDefinition {
    return this.definition
  }

  getId(): string {
    return this.definition.id
  }

  isNearPlayer(playerX: number, playerY: number, range: number): boolean {
    if (this.destroyed) return false
    const dx = this.sprite.x - playerX
    const dy = this.sprite.y - playerY
    return dx * dx + dy * dy <= range * range
  }

  updateHint(playerX: number, playerY: number): void {
    if (this.destroyed) return
    const near = this.isNearPlayer(playerX, playerY, INTERACT_HINT_RANGE)
    this.hint.setVisible(near)
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  destroy(): void {
    this.destroyed = true
    this.sprite.destroy()
    this.label.destroy()
    this.hint.destroy()
  }
}
