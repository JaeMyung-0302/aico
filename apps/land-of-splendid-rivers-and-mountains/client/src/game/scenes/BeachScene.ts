import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { Player } from '../entities/Player'
import { InputManager } from '../input/input-manager'
import { KeyboardInput } from '../input/keyboard-input'
import { TouchInput } from '../input/touch-input'
import { InventorySystem } from '../systems/inventory'
import { createPositionEmitter } from '../utils/position-emitter'
import { eventBus } from '@/lib/event-bus'
import { saveManager } from '@/lib/save-manager'
import { useGameStore } from '@/stores/useGameStore'
const PLAYER_SPAWN_X = 12
const PLAYER_SPAWN_Y = 1

export class BeachScene extends Phaser.Scene {
  private player!: Player
  private inputManager!: InputManager
  private keyboardInput!: KeyboardInput
  private touchInput!: TouchInput
  private readonly emitPosition = createPositionEmitter('BeachScene')

  constructor() {
    super({ key: 'BeachScene' })
  }

  preload(): void {
    this.createTilesetTexture()
    this.load.tilemapTiledJSON('beach-map', '/assets/tilemaps/beach.json')
  }

  create(): void {
    this.isTransitioning = false
    const map = this.loadTilemap()

    this.inputManager = new InputManager()
    this.keyboardInput = new KeyboardInput()
    this.touchInput = new TouchInput()
    this.keyboardInput.init(this)
    this.touchInput.init(this)

    const spawnX = PLAYER_SPAWN_X * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2
    const spawnY = PLAYER_SPAWN_Y * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2
    this.player = new Player(this, spawnX, spawnY)
    this.player.sprite.setDepth(10)

    const inventory = new InventorySystem()
    const store = useGameStore.getState()
    inventory.loadState(store.inventory, store.equippedTools)

    const syncInventory = () => {
      const state = inventory.getState()
      useGameStore.getState().setInventory(state.slots)
      useGameStore.getState().setEquippedTools(state.equipped)
    }

    eventBus.on('inventory:equipped', syncInventory)

    this.setupCollision(map)
    this.setupCamera(map)

    this.events.once('shutdown', () => {
      syncInventory()
      saveManager.patchSave({
        equippedTools: inventory.getEquipped(),
        inventory: [...inventory.getSlots()],
      })
      inventory.destroy()
      eventBus.off('inventory:equipped', syncInventory)
      this.keyboardInput.destroy()
      this.touchInput.destroy()
      this.player.destroy()
    })
  }

  update(): void {
    const pointer = this.input.activePointer
    const isTouchActive = pointer.isDown && pointer.wasTouch
    const rawState = isTouchActive
      ? this.touchInput.getState()
      : this.keyboardInput.getState()

    this.inputManager.updateFromProvider(rawState)

    if (useGameStore.getState().dialogOpen) {
      this.player.sprite.setVelocity(0, 0)
      return
    }

    this.player.update(this.inputManager.getState())
    this.emitPosition(this.player.sprite, this.time.now)

    this.checkPortal()
  }

  private isTransitioning = false

  private checkPortal(): void {
    if (this.isTransitioning) return

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE)
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE)

    if (tileY <= 0 && tileX >= 12 && tileX <= 13) {
      this.isTransitioning = true
      this.scene.start('RiverScene', { spawnX: 12, spawnY: 28 })
    }
  }

  private createTilesetTexture(): void {
    if (this.textures.exists('tileset-beach')) return
    const size = GAME_CONSTANTS.TILE_SIZE
    const colors = [0x228b22, 0xf4d03f, 0x1e88e5, 0xa0887a]

    const canvas = this.textures.createCanvas('tileset-beach', size * 2, size * 2)
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

  private loadTilemap(): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key: 'beach-map' })
    const tileset = map.addTilesetImage('beach-tiles', 'tileset-beach')
    if (!tileset) throw new Error('Failed to load beach tileset')

    map.createLayer('ground', tileset)?.setDepth(0)
    map.createLayer('path', tileset)?.setDepth(1)
    map.createLayer('objects', tileset)?.setDepth(2)
    map.createLayer('collision', tileset)?.setVisible(false)

    return map
  }

  private setupCollision(map: Phaser.Tilemaps.Tilemap): void {
    const collisionLayer = map.getLayer('collision')?.tilemapLayer
    if (!collisionLayer) return

    collisionLayer.setCollisionByExclusion([-1, 0])
    this.physics.add.collider(this.player.sprite, collisionLayer)
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
  }
}
