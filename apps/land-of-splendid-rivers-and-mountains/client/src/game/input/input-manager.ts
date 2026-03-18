export interface InputState {
  readonly moveX: number
  readonly moveY: number
  readonly action: boolean
  readonly cancel: boolean
  readonly interact: boolean
}

const DEFAULT_STATE: InputState = {
  moveX: 0,
  moveY: 0,
  action: false,
  cancel: false,
  interact: false,
}

export class InputManager {
  private state: InputState = { ...DEFAULT_STATE }

  getState(): InputState {
    return { ...this.state }
  }

  updateFromProvider(raw: InputState): void {
    const { moveX, moveY } = this.normalizeMovement(raw.moveX, raw.moveY)
    this.state = {
      moveX,
      moveY,
      action: raw.action,
      cancel: raw.cancel,
      interact: raw.interact,
    }
  }

  reset(): void {
    this.state = { ...DEFAULT_STATE }
  }

  private normalizeMovement(x: number, y: number): { moveX: number; moveY: number } {
    const magnitude = Math.sqrt(x * x + y * y)
    if (magnitude === 0) {
      return { moveX: 0, moveY: 0 }
    }
    if (magnitude > 1) {
      return { moveX: x / magnitude, moveY: y / magnitude }
    }
    return { moveX: x, moveY: y }
  }
}
