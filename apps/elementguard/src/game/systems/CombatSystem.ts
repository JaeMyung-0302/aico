import type { PlacedUnit, Element } from '@/types'
import { getUnitById, getGradeMultiplier } from '@/game/data/units'
import { getFusionUnit } from '@/game/data/fusions'
import { getElementMultiplier, getFusionElementMultiplier } from './ElementSystem'
import { getTerrainMultiplier, type TerrainTile } from './TerrainSystem'
import { getSynergyMultiplier, countAdjacentUnits, hasRainbowSynergy } from './SynergySystem'
import type { ArtifactBonuses } from './ArtifactSystem'
import type { EnemyEntity } from '@/game/entities/Enemy'

export interface DamageResult {
  damage: number
  isCrit: boolean
  elementMultiplier: number
}

// 유닛의 최종 데미지 계산
export const calculateDamage = (
  unit: PlacedUnit,
  targetElement: Element,
  allUnits: PlacedUnit[],
  terrains: TerrainTile[],
  bonuses: ArtifactBonuses,
): DamageResult => {
  // 1. 기본 공격력
  let baseAtk: number
  let unitElement: Element

  if (unit.fusionElement) {
    const fusionData = getFusionUnit(unit.fusionElement)
    baseAtk = fusionData?.baseAtk ?? 20
    unitElement = fusionData?.elements[0] ?? 'fire'
  } else {
    const unitData = getUnitById(unit.unitDataId)
    baseAtk = unitData?.baseAtk ?? 10
    unitElement = unitData?.element ?? 'fire'
  }

  // 2. 등급 배율
  const gradeMultiplier = getGradeMultiplier(unit.grade)

  // 3. 속성 상성 배율
  let elementMultiplier: number
  if (unit.fusionElement) {
    elementMultiplier = getFusionElementMultiplier(unit.fusionElement, targetElement)
  } else {
    elementMultiplier = getElementMultiplier(unitElement, targetElement)
  }

  // 3b. 유물로 상성 유리 배율 증가
  if (elementMultiplier > 1.0 && bonuses.advantageBoost > 0) {
    elementMultiplier += bonuses.advantageBoost
  }

  // 4. 지형 배율
  const terrainMultiplier = getTerrainMultiplier(
    terrains,
    unit.position,
    unitElement,
    bonuses.terrainBoost,
  )

  // 5. 시너지 배율
  const synergyMultiplier = getSynergyMultiplier(unit, allUnits, bonuses.synergyBoost)

  // 6. 유물 공격력 보너스
  const atkBonusAll = bonuses.atkPercent['all'] ?? 0
  const atkBonusElement = bonuses.atkPercent[unitElement] ?? 0
  const artifactAtkMultiplier = 1 + atkBonusAll + atkBonusElement

  // 7. 레인보우 보너스
  const rainbowMultiplier = hasRainbowSynergy(allUnits) ? 1 + bonuses.rainbowBonus : 1.0

  // 8. 체인 보너스 (인접 유닛 수 x 보너스)
  const adjacentCount = countAdjacentUnits(unit, allUnits)
  const chainMultiplier = 1 + adjacentCount * bonuses.chainBonus

  // 9. 크리티컬
  const isCrit = Math.random() < bonuses.critChance
  const critMultiplier = isCrit ? 1.5 : 1.0

  // 최종 계산
  const damage = Math.round(
    baseAtk
    * gradeMultiplier
    * elementMultiplier
    * terrainMultiplier
    * synergyMultiplier
    * artifactAtkMultiplier
    * rainbowMultiplier
    * chainMultiplier
    * critMultiplier,
  )

  return { damage, isCrit, elementMultiplier }
}

// 가장 가까운 적 타겟 찾기 (사거리 내)
export const findTarget = (
  unitWorldX: number,
  unitWorldY: number,
  range: number,
  slotSize: number,
  enemies: EnemyEntity[],
): EnemyEntity | undefined => {
  const rangeInPx = range * slotSize
  let closestEnemy: EnemyEntity | undefined
  let closestDist = Infinity

  for (const enemy of enemies) {
    if (enemy.isDead) continue

    const dx = enemy.x - unitWorldX
    const dy = enemy.y - unitWorldY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= rangeInPx && dist < closestDist) {
      closestDist = dist
      closestEnemy = enemy
    }
  }

  return closestEnemy
}
