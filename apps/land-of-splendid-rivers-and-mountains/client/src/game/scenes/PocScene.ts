import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'

interface BenchmarkSprite {
  readonly sprite: Phaser.GameObjects.Rectangle
  vx: number
  vy: number
}

export class PocScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text
  private spriteCountText!: Phaser.GameObjects.Text
  private readonly benchmarkSprites: BenchmarkSprite[] = []
  private fpsTimer = 0

  constructor() {
    super({ key: 'PocScene' })
  }

  preload(): void {
    this.createTilesetTexture()
    this.load.tilemapTiledJSON('sample-farm', '/maps/sample-farm.json')
  }

  create(): void {
    this.loadTiledMap()
    this.spawnBenchmarkSprites(100)
    this.createHud()
  }

  update(_time: number, delta: number): void {
    const width = GAME_CONSTANTS.GAME_WIDTH
    const height = GAME_CONSTANTS.GAME_HEIGHT
    const dt = delta / 1000

    for (const entry of this.benchmarkSprites) {
      entry.sprite.x += entry.vx * dt
      entry.sprite.y += entry.vy * dt

      if (entry.sprite.x < 0) {
        entry.vx = Math.abs(entry.vx)
        entry.sprite.x = 0
      } else if (entry.sprite.x > width) {
        entry.vx = -Math.abs(entry.vx)
        entry.sprite.x = width
      }
      if (entry.sprite.y < 0) {
        entry.vy = Math.abs(entry.vy)
        entry.sprite.y = 0
      } else if (entry.sprite.y > height) {
        entry.vy = -Math.abs(entry.vy)
        entry.sprite.y = height
      }
    }

    this.fpsTimer += delta
    if (this.fpsTimer >= 500) {
      this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`)
      this.fpsTimer = 0
    }
  }

  private createTilesetTexture(): void {
    const size = GAME_CONSTANTS.TILE_SIZE
    const colors = [0x228b22, 0x8b6914, 0x4169e1, 0x9e9e9e] // grass, dirt, water, stone wall

    const canvas = this.textures.createCanvas('tileset-poc', size * 2, size * 2)
    if (!canvas) return

    const ctx = canvas.context
    for (let i = 0; i < colors.length; i++) {
      const x = (i % 2) * size
      const y = Math.floor(i / 2) * size
      const hex = colors[i]!
      ctx.fillStyle = `#${hex.toString(16).padStart(6, '0')}`
      ctx.fillRect(x, y, size, size)
    }
    canvas.refresh()
  }

  private loadTiledMap(): void {
    const map = this.make.tilemap({ key: 'sample-farm' })
    const tileset = map.addTilesetImage('farm-tiles', 'tileset-poc')
    if (!tileset) return

    const groundLayer = map.createLayer('ground', tileset)
    groundLayer?.setDepth(0)

    const collisionLayer = map.createLayer('collision', tileset)
    if (collisionLayer) {
      collisionLayer.setCollisionByExclusion([-1, 0])
      collisionLayer.setDepth(1)
      collisionLayer.setAlpha(0.5)
    }
  }

  private spawnBenchmarkSprites(count: number): void {
    const width = GAME_CONSTANTS.GAME_WIDTH
    const height = GAME_CONSTANTS.GAME_HEIGHT
    const size = GAME_CONSTANTS.TILE_SIZE / 2

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(size, width - size)
      const y = Phaser.Math.Between(size, height - size)
      const color = Phaser.Math.Between(0x000000, 0xffffff)

      const sprite = this.add.rectangle(x, y, size, size, color)
      sprite.setDepth(10)

      this.benchmarkSprites.push({
        sprite,
        vx: Phaser.Math.Between(-80, 80),
        vy: Phaser.Math.Between(-80, 80),
      })
    }
  }

  private createHud(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      color: '#ffff00',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 },
    }

    this.fpsText = this.add.text(10, 10, 'FPS: 0', style)
    this.fpsText.setScrollFactor(0).setDepth(1000)

    this.spriteCountText = this.add.text(
      10,
      30,
      `Sprites: ${this.benchmarkSprites.length} | Tiles: 15x27`,
      style,
    )
    this.spriteCountText.setScrollFactor(0).setDepth(1000)
  }
}
