import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import type { InputState } from '../input/input-manager'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'

const PLAYER_SPEED = 120
const ANIM_FRAME_RATE = 8

const IDLE_FRAMES: Record<Direction, number> = {
  down: 0,
  up: 4,
  left: 8,
  right: 12,
}

export type Direction = 'up' | 'down' | 'left' | 'right'

const TOOL_OFFSETS: Record<Direction, { x: number; y: number }> = {
  down: { x: 8, y: 6 },
  up: { x: -8, y: -2 },
  left: { x: -10, y: 4 },
  right: { x: 10, y: 4 },
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  private direction: Direction = 'down'
  private toolSprite: Phaser.GameObjects.Image | null = null
  private currentToolId: string | null = null

  private readonly onEquipped = ({ toolId }: { toolId: string | null }) => {
    this.setEquippedTool(toolId)
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player')
    this.sprite.setCollideWorldBounds(true)

    const body = this.sprite.body
    if (!body) throw new Error('Player physics body not initialized')

    const size = GAME_CONSTANTS.TILE_SIZE
    body.setSize(size * 0.7, size * 0.7)
    body.setOffset(
      (48 - size * 0.7) / 2,
      48 - size * 0.7 - 2,
    )

    this.createAnimations(scene)
    this.sprite.setFrame(IDLE_FRAMES.down)

    const initialTool = useGameStore.getState().equippedTools.current
    if (initialTool) {
      this.setEquippedTool(initialTool)
    }
    eventBus.on('inventory:equipped', this.onEquipped)
  }

  update(input: InputState): void {
    const vx = input.moveX * PLAYER_SPEED
    const vy = input.moveY * PLAYER_SPEED
    this.sprite.setVelocity(vx, vy)

    const isMoving = input.moveX !== 0 || input.moveY !== 0

    if (isMoving) {
      this.updateDirection(input)
      this.sprite.anims.play(`walk-${this.direction}`, true)
    } else {
      this.sprite.anims.stop()
      this.sprite.setFrame(IDLE_FRAMES[this.direction])
    }

    this.updateToolPosition()
  }

  getDirection(): Direction {
    return this.direction
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  setEquippedTool(toolId: string | null): void {
    if (toolId === this.currentToolId) return
    this.currentToolId = toolId

    if (this.toolSprite) {
      this.toolSprite.destroy()
      this.toolSprite = null
    }

    if (toolId && this.sprite.scene.textures.exists(toolId)) {
      this.toolSprite = this.sprite.scene.add.image(this.sprite.x, this.sprite.y, toolId)
      this.toolSprite.setDepth(this.sprite.depth + 1)
      this.toolSprite.setScale(0.8)
      this.updateToolPosition()
    }
  }

  destroy(): void {
    eventBus.off('inventory:equipped', this.onEquipped)
    if (this.toolSprite) {
      this.toolSprite.destroy()
      this.toolSprite = null
    }
    this.sprite.destroy()
  }

  private updateToolPosition(): void {
    if (!this.toolSprite) return
    const offset = TOOL_OFFSETS[this.direction]
    this.toolSprite.setPosition(this.sprite.x + offset.x, this.sprite.y + offset.y)
    this.toolSprite.setFlipX(this.direction === 'left')
  }

  private updateDirection(input: InputState): void {
    if (Math.abs(input.moveX) > Math.abs(input.moveY)) {
      this.direction = input.moveX > 0 ? 'right' : 'left'
    } else {
      this.direction = input.moveY > 0 ? 'down' : 'up'
    }
  }

  private createAnimations(scene: Phaser.Scene): void {
    const directions: ReadonlyArray<readonly [Direction, number]> = [
      ['down', 0],
      ['up', 4],
      ['left', 8],
      ['right', 12],
    ]

    for (const [dir, start] of directions) {
      const key = `walk-${dir}`
      if (scene.anims.exists(key)) continue
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('player', {
          start,
          end: start + 3,
        }),
        frameRate: ANIM_FRAME_RATE,
        repeat: -1,
      })
    }
  }
}
