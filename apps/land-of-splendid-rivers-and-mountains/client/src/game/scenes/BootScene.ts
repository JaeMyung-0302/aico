import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import assetManifest from '@/game/data/assets.json'
import cropsData from '@/game/data/crops.json'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    const width = GAME_CONSTANTS.GAME_WIDTH
    const height = GAME_CONSTANTS.GAME_HEIGHT

    const barWidth = width * 0.6
    const barHeight = 20
    const barX = (width - barWidth) / 2
    const barY = height / 2

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(barX, barY, barWidth, barHeight)

    const loadingText = this.add.text(width / 2, barY - 30, '로딩중...', {
      fontSize: '16px',
      color: '#ffffff',
    })
    loadingText.setOrigin(0.5, 0.5)

    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x4ade80, 1)
      progressBar.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })

    this.createPlaceholderTextures()
    this.loadAssets()
  }

  create(): void {
    eventBus.emit('title:ready', undefined)

    const onTitleStart = () => {
      if (!this.scene?.manager) return
      this.scene.start('VillageScene')
    }
    eventBus.on('title:start', onTitleStart)

    const cleanup = () => {
      eventBus.off('title:start', onTitleStart)
    }
    this.events.once('shutdown', cleanup)
    this.events.once('destroy', cleanup)
  }

  private loadAssets(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[BootScene] Asset not found, using placeholder: ${file.key}`)
    })

    // Player spritesheet: 4 columns x 4 rows of 48x48 frames
    this.load.spritesheet('player', 'assets/sprites/player/player.png', {
      frameWidth: 48,
      frameHeight: 48,
    })

    // Crop spritesheets: 3 columns x 1 row of 32x32 frames (sprout, growing, ready)
    const cropKeys = new Set(cropsData.map((c: { id: string }) => `crop-${c.id}`))
    for (const cropKey of cropKeys) {
      const cropFile = cropKey.replace('crop-', '')
      this.load.spritesheet(cropKey, `assets/sprites/crop/${cropFile}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      })
    }

    // Monster spritesheets: 4 columns x 4 rows of 64x64 frames
    // Only load monsters that have spritesheet files; others use placeholder
    const MONSTER_SPRITESHEETS = ['dokkaebi', 'cheuksin', 'gwishin', 'gumiho', 'jangsan', 'haetae', 'samjokgu', 'dalgyal']
    const monsterKeys = new Set(MONSTER_SPRITESHEETS.map((id) => `monster-${id}`))
    for (const monsterKey of monsterKeys) {
      const monsterFile = monsterKey.replace('monster-', '')
      this.load.spritesheet(monsterKey, `assets/sprites/monster/${monsterFile}.png`, {
        frameWidth: 64,
        frameHeight: 64,
      })
    }

    // Strong monster: 96x96 frames
    this.load.spritesheet('monster-bulgasari', 'assets/sprites/monster/bulgasari.png', {
      frameWidth: 96,
      frameHeight: 96,
    })

    // Boss monster: 128x128 frames
    this.load.spritesheet('monster-imugi', 'assets/sprites/monster/imugi.png', {
      frameWidth: 128,
      frameHeight: 128,
    })

    // Only attempt to load images that actually exist on disk.
    // Placeholder textures cover all keys, so missing files are safe.
    for (const entry of assetManifest.images) {
      if (entry.key === 'player') continue
      if (cropKeys.has(entry.key)) continue
      if (monsterKeys.has(entry.key)) continue
      if (this.textures.exists(entry.key)) continue
      this.load.image(entry.key, entry.path)
    }

    // Tool item icons for equipped display
    const toolNames = ['hoe', 'wateringCan', 'axe', 'pickaxe', 'fishingRod', 'sword']
    for (const name of toolNames) {
      const key = `tool-${name}`
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/icons/tools/${name}.png`)
      }
    }

    // Audio loading is skipped until real audio files are provided.
    // The AudioSystem guards with cache.audio.exists() before playback,
    // so missing audio keys are handled gracefully at runtime.
  }

  private createPlaceholderTextures(): void {
    const size = GAME_CONSTANTS.TILE_SIZE

    const placeholders: ReadonlyArray<readonly [string, number]> = [
      ['tile-dirt', 0x8b6914],
      ['tile-grass', 0x228b22],
      ['crop-sprout', 0x90ee90],
      ['crop-growing', 0x32cd32],
      ['crop-ready', 0xffd700],
      ['npc-default', 0x6495ed],
      ['monster-default', 0xdc143c],
    ]

    const g = this.make.graphics({ x: 0, y: 0 })
    for (const [key, color] of placeholders) {
      g.clear()
      g.fillStyle(color, 1)
      g.fillRect(0, 0, size, size)
      g.generateTexture(key, size, size)
    }
    g.destroy()
  }
}
