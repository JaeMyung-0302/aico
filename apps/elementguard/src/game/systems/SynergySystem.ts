import type { PlacedUnit, GridPosition, Element } from '@/types'
import { ALL_ELEMENTS } from './ElementSystem'

const GRID_SIZE = 5

// 시너지 보너스: 같은 속성 3유닛 인접 시 공격력 +15%
const BASE_SYNERGY_BONUS = 0.15
const SYNERGY_THRESHOLD = 3

// 인접 유닛 위치 계산 (상하좌우)
export const getAdjacentPositions = (pos: GridPosition): GridPosition[] => {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ]

  return directions
    .map((d) => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter((p) => p.row >= 0 && p.row < GRID_SIZE && p.col >= 0 && p.col < GRID_SIZE)
}

// 유닛의 속성 추출
const getUnitElement = (unit: PlacedUnit): Element | undefined => {
  const prefix = unit.unitDataId.split('-')[0]
  const elements: Element[] = ALL_ELEMENTS
  return elements.find((e) => e === prefix)
}

// 특정 위치의 유닛 조회
const getUnitAt = (units: PlacedUnit[], pos: GridPosition): PlacedUnit | undefined =>
  units.find((u) => u.position.row === pos.row && u.position.col === pos.col)

// 특정 유닛의 인접 같은 속성 유닛 수 계산
export const countAdjacentSameElement = (
  unit: PlacedUnit,
  allUnits: PlacedUnit[],
): number => {
  const element = getUnitElement(unit)
  if (!element) return 0

  const adjacentPositions = getAdjacentPositions(unit.position)
  let count = 1 // 자기 자신 포함

  for (const pos of adjacentPositions) {
    const adjacentUnit = getUnitAt(allUnits, pos)
    if (adjacentUnit && getUnitElement(adjacentUnit) === element) {
      count++
    }
  }

  return count
}

// 시너지 보너스 계산
export const getSynergyMultiplier = (
  unit: PlacedUnit,
  allUnits: PlacedUnit[],
  synergyBoostBonus: number = 0,
): number => {
  const count = countAdjacentSameElement(unit, allUnits)

  if (count >= SYNERGY_THRESHOLD) {
    const baseBonus = BASE_SYNERGY_BONUS
    const boosted = baseBonus * (1 + synergyBoostBonus)
    return 1 + boosted
  }

  return 1.0
}

// 레인보우 보너스: 5속성 모두 배치 시 확인
export const hasRainbowSynergy = (units: PlacedUnit[]): boolean => {
  const presentElements = new Set<string>()

  for (const unit of units) {
    const element = getUnitElement(unit)
    if (element) presentElements.add(element)
  }

  return presentElements.size >= ALL_ELEMENTS.length
}

// 인접 유닛 수 계산 (체인 보너스용)
export const countAdjacentUnits = (
  unit: PlacedUnit,
  allUnits: PlacedUnit[],
): number => {
  const adjacentPositions = getAdjacentPositions(unit.position)
  let count = 0

  for (const pos of adjacentPositions) {
    if (getUnitAt(allUnits, pos)) count++
  }

  return count
}
