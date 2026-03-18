import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import type { InputState } from './input-manager'

const JOYSTICK_RADIUS = 56
const JOYSTICK_DEAD_ZONE = 12
const BUTTON_RADIUS = 28
const BUTTON_HIT_RADIUS = 48

export class TouchInput {
  private scene!: Phaser.Scene
  private joystickBase!: Phaser.GameObjects.Arc
  private joystickThumb!: Phaser.GameObjects.Arc
  private actionButton!: Phaser.GameObjects.Arc
  private interactButton!: Phaser.GameObjects.Arc
  private moveX = 0
  private moveY = 0
  private actionPressed = false
  private interactPressed = false
  private joystickPointerId: number | null = null

  private enabled = false

  init(scene: Phaser.Scene): void {
    this.scene = scene

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) return

    this.enabled = true
    this.createJoystick()
    this.createButtons()
    this.scene.input.on('pointerdown', this.onPointerDown, this)
    this.scene.input.on('pointermove', this.onPointerMove, this)
    this.scene.input.on('pointerup', this.onPointerUp, this)
  }

  getState(): InputState {
    return {
      moveX: this.moveX,
      moveY: this.moveY,
      action: this.actionPressed,
      cancel: false,
      interact: this.interactPressed,
    }
  }

  destroy(): void {
    if (!this.enabled) return
    this.scene.input.off('pointerdown', this.onPointerDown, this)
    this.scene.input.off('pointermove', this.onPointerMove, this)
    this.scene.input.off('pointerup', this.onPointerUp, this)
    this.joystickBase?.destroy()
    this.joystickThumb?.destroy()
    this.actionButton?.destroy()
    this.interactButton?.destroy()
  }

  private createJoystick(): void {
    const x = 80
    const y = GAME_CONSTANTS.GAME_HEIGHT - 100

    this.joystickBase = this.scene.add.circle(x, y, JOYSTICK_RADIUS, 0x000000, 0.3)
    this.joystickBase.setScrollFactor(0).setDepth(900)

    this.joystickThumb = this.scene.add.circle(x, y, JOYSTICK_RADIUS * 0.4, 0xffffff, 0.5)
    this.joystickThumb.setScrollFactor(0).setDepth(901)
  }

  private createButtons(): void {
    const baseX = GAME_CONSTANTS.GAME_WIDTH - 70
    const baseY = GAME_CONSTANTS.GAME_HEIGHT - 120

    this.actionButton = this.scene.add.circle(baseX, baseY, BUTTON_RADIUS, 0xff4444, 0.5)
    this.actionButton.setScrollFactor(0).setDepth(900)

    this.interactButton = this.scene.add.circle(baseX - 60, baseY + 20, BUTTON_RADIUS, 0x44aaff, 0.5)
    this.interactButton.setScrollFactor(0).setDepth(900)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.x < GAME_CONSTANTS.GAME_WIDTH / 2) {
      this.joystickPointerId = pointer.id
      this.updateJoystick(pointer)
    } else {
      this.checkButtonPress(pointer, true)
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.updateJoystick(pointer)
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.resetJoystick()
      this.joystickPointerId = null
    } else {
      this.checkButtonPress(pointer, false)
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const baseX = this.joystickBase.x
    const baseY = this.joystickBase.y
    const dx = pointer.x - baseX
    const dy = pointer.y - baseY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < JOYSTICK_DEAD_ZONE) {
      this.moveX = 0
      this.moveY = 0
      this.joystickThumb.setPosition(baseX, baseY)
      return
    }

    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS)
    const angle = Math.atan2(dy, dx)

    this.joystickThumb.setPosition(
      baseX + Math.cos(angle) * clampedDistance,
      baseY + Math.sin(angle) * clampedDistance,
    )

    this.moveX = Math.cos(angle) * (clampedDistance / JOYSTICK_RADIUS)
    this.moveY = Math.sin(angle) * (clampedDistance / JOYSTICK_RADIUS)
  }

  private resetJoystick(): void {
    this.moveX = 0
    this.moveY = 0
    this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y)
  }

  private checkButtonPress(pointer: Phaser.Input.Pointer, isDown: boolean): void {
    const actionDist = Phaser.Math.Distance.Between(
      pointer.x, pointer.y,
      this.actionButton.x, this.actionButton.y,
    )
    const interactDist = Phaser.Math.Distance.Between(
      pointer.x, pointer.y,
      this.interactButton.x, this.interactButton.y,
    )

    const actionHit = actionDist <= BUTTON_HIT_RADIUS
    const interactHit = interactDist <= BUTTON_HIT_RADIUS

    if (actionHit && interactHit) {
      if (actionDist <= interactDist) {
        this.actionPressed = isDown
      } else {
        this.interactPressed = isDown
      }
    } else if (actionHit) {
      this.actionPressed = isDown
    } else if (interactHit) {
      this.interactPressed = isDown
    }
  }
}
