import type { TileType } from './tiles.js'

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Key = 'w' | 'a' | 's' | 'd'

export type GamePhase =
  | 'lobby'
  | 'playing'
  | 'death'
  | 'stage-clear'
  | 'complete'

export interface KeyAssignment {
  playerId: string
  keys: Key[]
}

export interface Player {
  id: string
  nickname: string
  keys: Key[]
  isHost: boolean
}

export interface Position {
  x: number
  y: number
}

export interface GameState {
  position: Position
  direction: Direction
  moving: boolean
  coins: number
  totalCoins: number
  deaths: number
  stage: number
  totalStages: number
  elapsedTime: number
  phase: GamePhase
  obstacles: Obstacle[]
  collectedCoins: string[]
}

export interface Obstacle {
  id: string
  position: Position
  size: { width: number; height: number }
}

export interface ObstacleConfig {
  id: string
  waypoints: Position[]
  speed: number
  size: { width: number; height: number }
}

export interface DeathLogEntry {
  tick: number
  key: Key
  playerId: string
  nickname: string
  direction: Direction
}

export interface DeathEvent {
  deaths: number
  log: DeathLogEntry[]
  culpritId: string
  culpritNickname: string
}

export interface Room {
  code: string
  players: Player[]
  hostId: string
  phase: GamePhase
  stage: number
}

export interface RankingEntry {
  nicknames: string[]
  elapsedTime: number
  deaths: number
  playerCount: number
  clearedAt: number
}

export type TileMap = TileType[][]
