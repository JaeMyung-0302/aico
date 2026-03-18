import Phaser from 'phaser'
import type { InputState } from './input-manager'

export class KeyboardInput {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>
  private spaceKey?: Phaser.Input.Keyboard.Key
  private escKey?: Phaser.Input.Keyboard.Key
  private eKey?: Phaser.Input.Keyboard.Key

  init(scene: Phaser.Scene): void {
    const keyboard = scene.input.keyboard
    if (!keyboard) return

    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
  }

  getState(): InputState {
    let moveX = 0
    let moveY = 0

    if (this.cursors?.left?.isDown || this.wasd?.A?.isDown) moveX -= 1
    if (this.cursors?.right?.isDown || this.wasd?.D?.isDown) moveX += 1
    if (this.cursors?.up?.isDown || this.wasd?.W?.isDown) moveY -= 1
    if (this.cursors?.down?.isDown || this.wasd?.S?.isDown) moveY += 1

    return {
      moveX,
      moveY,
      action: this.spaceKey?.isDown ?? false,
      cancel: this.escKey?.isDown ?? false,
      interact: this.eKey?.isDown ?? false,
    }
  }

  destroy(): void {
    // Phaser handles key cleanup on scene shutdown
  }
}
