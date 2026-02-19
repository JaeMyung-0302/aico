import type { PlacedUnit, EvolutionBranch, UnitGrade } from '@/types'
import { getEvolutionData, getEvolutionBranch } from '@/game/data/evolutions'

// 진화 가능 최소 등급
const EVOLUTION_MIN_GRADE: UnitGrade = 3

// 진화 가능 여부 확인
export const canEvolve = (unit: PlacedUnit): boolean => {
  if (unit.fusionElement) return false // 융합 유닛은 진화 불가
  if (unit.evolutionId) return false // 이미 진화함
  if (unit.grade < EVOLUTION_MIN_GRADE) return false
  const evoData = getEvolutionData(unit.unitDataId)
  return evoData !== undefined
}

// 진화 분기 목록 조회
export const getEvolutionBranches = (unit: PlacedUnit): [EvolutionBranch, EvolutionBranch] | null => {
  if (!canEvolve(unit)) return null
  const evoData = getEvolutionData(unit.unitDataId)
  return evoData?.branches ?? null
}

// 진화 실행 — 선택한 분기를 적용한 새 PlacedUnit 반환 (immutable)
export const evolveUnit = (unit: PlacedUnit, branchId: string): PlacedUnit | null => {
  if (!canEvolve(unit)) return null
  const branch = getEvolutionBranch(branchId)
  if (!branch || branch.unitDataId !== unit.unitDataId) return null

  return {
    ...unit,
    evolutionId: branchId,
  }
}

// 진화된 유닛의 스탯 조회 (CombatSystem에서 사용)
export const getEvolvedStats = (unit: PlacedUnit): {
  baseAtk: number
  atkSpeed: number
  range: number
  bonusEffect: string
} | null => {
  if (!unit.evolutionId) return null
  const branch = getEvolutionBranch(unit.evolutionId)
  if (!branch) return null

  return {
    baseAtk: branch.baseAtk,
    atkSpeed: branch.atkSpeed,
    range: branch.range,
    bonusEffect: branch.bonusEffect,
  }
}
