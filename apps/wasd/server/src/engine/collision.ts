import type { Position, TileMap } from '@wasd/shared'
import { PLAYER_SIZE, TILE_SIZE, TileType } from '@wasd/shared'

const getOverlappingTiles = (position: Position) => {
  const startCol = Math.floor(position.x / TILE_SIZE)
  const endCol = Math.floor((position.x + PLAYER_SIZE - 1) / TILE_SIZE)
  const startRow = Math.floor(position.y / TILE_SIZE)
  const endRow = Math.floor((position.y + PLAYER_SIZE - 1) / TILE_SIZE)
  return { startCol, endCol, startRow, endRow }
}

export const checkWallCollision = (
  position: Position,
  tileMap: TileMap,
): boolean => {
  const { startCol, endCol, startRow, endRow } = getOverlappingTiles(position)

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (tileMap[row]?.[col] === TileType.WALL) return true
    }
  }
  return false
}

export const checkCoinCollection = (
  position: Position,
  tileMap: TileMap,
  collectedCoins: Set<string>,
): string[] => {
  const { startCol, endCol, startRow, endRow } = getOverlappingTiles(position)
  const collected: string[] = []

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = `${row},${col}`
      if (tileMap[row]?.[col] === TileType.COIN && !collectedCoins.has(key)) {
        collected.push(key)
      }
    }
  }
  return collected
}

export const checkGoalReached = (
  position: Position,
  tileMap: TileMap,
): boolean => {
  const { startCol, endCol, startRow, endRow } = getOverlappingTiles(position)

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (tileMap[row]?.[col] === TileType.GOAL) return true
    }
  }
  return false
}
