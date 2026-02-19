import type { PlacedUnit, UnitGrade, Element } from '@/types'
import { getFusionResult } from '@/game/data/fusions'
import { BASE_FUSION_CHANCE } from '@/game/data/fusions'

export interface MergeResult {
  type: 'upgrade' | 'fusion' | 'fusion_fail'
  resultUnit?: PlacedUnit
  consumedUnits: [PlacedUnit, PlacedUnit]
}

// 유닛 ID에서 속성 추출 (예: 'fire-warrior' → 'fire')
const getElementFromUnitId = (unitDataId: string): Element | undefined => {
  const prefix = unitDataId.split('-')[0]
  const elements: Element[] = ['fire', 'water', 'wind', 'thunder', 'earth']
  return elements.find((e) => e === prefix)
}

// 합치기 가능 여부 확인
export const canMerge = (unit1: PlacedUnit, unit2: PlacedUnit): boolean => {
  if (unit1.instanceId === unit2.instanceId) return false
  if (unit1.grade !== unit2.grade) return false
  if (unit1.grade >= 5) return false // ★5는 최대
  // 융합 유닛은 추가 합치기 불가
  if (unit1.fusionElement || unit2.fusionElement) return false
  // 같은 유닛이면 승급 가능
  if (unit1.unitDataId === unit2.unitDataId) return true
  // 다른 속성은 ★4+ 융합만 허용
  if (unit1.grade >= 4) {
    const elem1 = getElementFromUnitId(unit1.unitDataId)
    const elem2 = getElementFromUnitId(unit2.unitDataId)
    if (elem1 && elem2 && elem1 !== elem2 && getFusionResult(elem1, elem2)) return true
  }
  return false
}

// 같은 속성 합치기 → 등급 승급 (진화 상태 보존)
const upgradeUnit = (unit1: PlacedUnit, _unit2: PlacedUnit): PlacedUnit => ({
  instanceId: unit1.instanceId,
  unitDataId: unit1.unitDataId,
  grade: (unit1.grade + 1) as UnitGrade,
  position: unit1.position,
  fusionElement: unit1.fusionElement,
  evolutionId: unit1.evolutionId,
})

// 합치기 실행
export const executeMerge = (
  unit1: PlacedUnit,
  unit2: PlacedUnit,
  fusionChanceBonus: number = 0,
): MergeResult => {
  if (!canMerge(unit1, unit2)) {
    throw new Error('합칠 수 없는 유닛입니다.')
  }

  const consumedUnits: [PlacedUnit, PlacedUnit] = [unit1, unit2]

  // 같은 유닛(같은 속성, 같은 타입) → 단순 승급
  if (unit1.unitDataId === unit2.unitDataId) {
    return {
      type: 'upgrade',
      resultUnit: upgradeUnit(unit1, unit2),
      consumedUnits,
    }
  }

  // ★4+ 다른 속성 유닛 합치기 → 융합 시도
  if (unit1.grade >= 4) {
    const elem1 = getElementFromUnitId(unit1.unitDataId)
    const elem2 = getElementFromUnitId(unit2.unitDataId)

    if (elem1 && elem2 && elem1 !== elem2) {
      const fusionElement = getFusionResult(elem1, elem2)

      if (fusionElement) {
        const chance = Math.min(BASE_FUSION_CHANCE + fusionChanceBonus, 1.0)
        const roll = Math.random()

        if (roll < chance) {
          return {
            type: 'fusion',
            resultUnit: {
              instanceId: unit1.instanceId,
              unitDataId: `fusion-${fusionElement}`,
              grade: unit1.grade,
              position: unit1.position,
              fusionElement,
            },
            consumedUnits,
          }
        }

        return { type: 'fusion_fail', consumedUnits }
      }
    }
  }

  // canMerge에서 이미 검증되므로 여기 도달 불가
  throw new Error('합칠 수 없는 유닛입니다.')
}
