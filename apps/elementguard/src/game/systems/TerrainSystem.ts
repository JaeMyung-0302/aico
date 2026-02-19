import type { GridPosition, TerrainType, Element } from '@/types'
import { TERRAINS, TERRAIN_COUNT_MIN, TERRAIN_COUNT_MAX } from '@/game/data/terrains'
import { getPathGridPositions } from '@/game/systems/PathSystem'

export interface TerrainTile {
  position: GridPosition
  type: TerrainType
}

const GRID_SIZE = 5

// 판 시작 시 랜덤 지형 배치 (3~5칸)
export const generateTerrainLayout = (): TerrainTile[] => {
  const count = TERRAIN_COUNT_MIN + Math.floor(Math.random() * (TERRAIN_COUNT_MAX - TERRAIN_COUNT_MIN + 1))

  // 배치 가능 그리드 위치 목록 (경로 셀 제외)
  const pathCells = getPathGridPositions()
  const allPositions: GridPosition[] = []
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const isPath = pathCells.some((p) => p.row === row && p.col === col)
      if (!isPath) allPositions.push({ row, col })
    }
  }

  // 랜덤 위치 선택
  const selectedPositions: GridPosition[] = []
  const pool = [...allPositions]
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const pos = pool[idx]
    if (pos) selectedPositions.push(pos)
    pool.splice(idx, 1)
  }

  // 랜덤 지형 타입 배정
  return selectedPositions.map((position) => {
    const terrainIdx = Math.floor(Math.random() * TERRAINS.length)
    const terrain = TERRAINS[terrainIdx]
    return {
      position,
      type: terrain?.type ?? 'lava',
    }
  })
}

// 특정 위치의 지형 조회
export const getTerrainAt = (
  terrains: TerrainTile[],
  position: GridPosition,
): TerrainTile | undefined =>
  terrains.find((t) => t.position.row === position.row && t.position.col === position.col)

// 지형 효과에 의한 공격력 배율 계산
export const getTerrainMultiplier = (
  terrains: TerrainTile[],
  position: GridPosition,
  unitElement: Element,
  terrainBoostBonus: number = 0,
): number => {
  const terrain = getTerrainAt(terrains, position)
  if (!terrain) return 1.0

  const terrainData = TERRAINS.find((t) => t.type === terrain.type)
  if (!terrainData) return 1.0

  // 유닛 속성이 지형 버프 속성과 일치하면 효과 적용
  if (terrainData.buffElement === unitElement) {
    const baseMultiplier = terrainData.effectMultiplier
    const bonus = (baseMultiplier - 1) * terrainBoostBonus
    return baseMultiplier + bonus
  }

  return 1.0
}
