import type {
  Position,
  Direction,
  GamePhase,
  GameState,
  Key,
  TileMap,
  Obstacle,
} from '@wasd/shared'
import { TILE_SIZE, PLAYER_SIZE, TileType, STAGES } from '@wasd/shared'

export interface InputEntry {
  key: Key
  playerId: string
  nickname: string
}

export const findStartPosition = (tileMap: TileMap): Position => {
  for (let row = 0; row < tileMap.length; row++) {
    const tileRow = tileMap[row]
    if (!tileRow) continue
    for (let col = 0; col < tileRow.length; col++) {
      if (tileRow[col] === TileType.START) {
        return {
          x: col * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
          y: row * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
        }
      }
    }
  }
  return { x: TILE_SIZE + 8, y: TILE_SIZE + 8 }
}

export const countCoins = (tileMap: TileMap): number => {
  let count = 0
  for (const row of tileMap) {
    for (const tile of row) {
      if (tile === TileType.COIN) count++
    }
  }
  return count
}

export class ServerGameState {
  position: Position
  direction: Direction
  moving: boolean
  deaths: number
  stage: number
  coins: number
  totalCoins: number
  collectedCoins: Set<string>
  startTime: number
  phase: GamePhase
  tileMap: TileMap
  pendingInputs: InputEntry[]
  obstacles: Obstacle[]

  constructor(stage: number, carryDeaths = 0, carryStartTime = 0) {
    const tileMap = STAGES[stage - 1]
    if (!tileMap) throw new Error(`Invalid stage: ${stage}`)

    this.tileMap = tileMap
    this.position = findStartPosition(tileMap)
    this.direction = 'right'
    this.moving = false
    this.deaths = carryDeaths
    this.stage = stage
    this.coins = 0
    this.totalCoins = countCoins(tileMap)
    this.collectedCoins = new Set()
    this.startTime = carryStartTime || Date.now()
    this.phase = 'playing'
    this.pendingInputs = []
    this.obstacles = []
  }

  toGameState(): GameState {
    return {
      position: { ...this.position },
      direction: this.direction,
      moving: this.moving,
      coins: this.coins,
      totalCoins: this.totalCoins,
      deaths: this.deaths,
      stage: this.stage,
      totalStages: STAGES.length,
      elapsedTime: Date.now() - this.startTime,
      phase: this.phase,
      obstacles: this.obstacles,
      collectedCoins: [...this.collectedCoins],
    }
  }

  resetPosition(): void {
    this.position = findStartPosition(this.tileMap)
    this.direction = 'right'
    this.moving = false
    this.coins = 0
    this.collectedCoins.clear()
  }
}
