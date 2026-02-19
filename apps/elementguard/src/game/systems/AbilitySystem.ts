import type { PlacedUnit, AbilityData, ActiveDebuff, ActiveBuff, GridPosition } from '@/types'
import { getUnitAbility } from '@/game/data/abilities'
import { addDebuff, addBuff } from './DebuffSystem'
import type { EnemyEntity } from '@/game/entities/Enemy'

// === AOE: 타겟 주변 적에게 범위 데미지 ===
export const applyAoe = (
  target: EnemyEntity,
  damage: number,
  ability: AbilityData,
  enemies: EnemyEntity[],
  slotSize: number,
): { enemy: EnemyEntity; aoeDamage: number }[] => {
  const radiusPx = (ability.params.radius ?? 1.5) * slotSize
  const falloff = ability.params.damageFalloff ?? 0.5
  const aoeDamage = Math.round(damage * falloff)
  const results: { enemy: EnemyEntity; aoeDamage: number }[] = []

  for (const enemy of enemies) {
    if (enemy === target || enemy.isDead) continue
    const dx = enemy.x - target.x
    const dy = enemy.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= radiusPx) {
      results.push({ enemy, aoeDamage })
    }
  }

  return results
}

// === Chain: 타겟 주변 적 1기에 추가 데미지 ===
export const applyChain = (
  target: EnemyEntity,
  damage: number,
  ability: AbilityData,
  enemies: EnemyEntity[],
  slotSize: number,
): { enemy: EnemyEntity; chainDamage: number } | undefined => {
  const radiusPx = (ability.params.chainRadius ?? 1) * slotSize
  const ratio = ability.params.chainDamageRatio ?? 0.5
  const chainDamage = Math.round(damage * ratio)

  let closestEnemy: EnemyEntity | undefined
  let closestDist = Infinity

  for (const enemy of enemies) {
    if (enemy === target || enemy.isDead) continue
    const dx = enemy.x - target.x
    const dy = enemy.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= radiusPx && dist < closestDist) {
      closestDist = dist
      closestEnemy = enemy
    }
  }

  return closestEnemy ? { enemy: closestEnemy, chainDamage } : undefined
}

// === Pierce: 경로상 타겟 뒤쪽 적 1기에 추가 데미지 ===
export const applyPierce = (
  target: EnemyEntity,
  damage: number,
  ability: AbilityData,
  enemies: EnemyEntity[],
  _slotSize: number,
): { enemy: EnemyEntity; pierceDamage: number } | undefined => {
  const ratio = ability.params.pierceDamageRatio ?? 0.7
  const pierceDamage = Math.round(damage * ratio)

  // 타겟과 가장 가까우면서 경로상 뒤쪽에 있는 적 찾기
  // "뒤쪽" = 타겟보다 x or y가 경로 진행 방향 기준 뒤에 있는 적
  // 간단 구현: 타겟에서 가장 가까운 다른 적 (이미 타겟 주변에 있을 가능성 높음)
  let bestEnemy: EnemyEntity | undefined
  let bestDist = Infinity

  for (const enemy of enemies) {
    if (enemy === target || enemy.isDead) continue
    const dx = enemy.x - target.x
    const dy = enemy.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist) {
      bestDist = dist
      bestEnemy = enemy
    }
  }

  return bestEnemy ? { enemy: bestEnemy, pierceDamage } : undefined
}

// === Slow: 타겟에 슬로우 디버프 적용 ===
export const applySlow = (
  targetId: string,
  ability: AbilityData,
  debuffs: ActiveDebuff[],
): ActiveDebuff[] =>
  addDebuff(
    debuffs,
    'slow',
    targetId,
    ability.params.slowPercent ?? 0.3,
    ability.params.durationMs ?? 2000,
  )

// === Debuff Armor: 타겟에 방어력 감소 디버프 적용 ===
export const applyArmorBreak = (
  targetId: string,
  ability: AbilityData,
  debuffs: ActiveDebuff[],
): ActiveDebuff[] =>
  addDebuff(
    debuffs,
    'armor_break',
    targetId,
    ability.params.armorBreak ?? 0.2,
    ability.params.durationMs ?? 3000,
  )

// === Prioritize HP: 가장 HP 높은 적 찾기 (findTarget 대체) ===
export const findHighestHpTarget = (
  unitWorldX: number,
  unitWorldY: number,
  range: number,
  slotSize: number,
  enemies: EnemyEntity[],
): EnemyEntity | undefined => {
  const rangeInPx = range * slotSize
  let bestEnemy: EnemyEntity | undefined
  let highestHp = -1

  for (const enemy of enemies) {
    if (enemy.isDead) continue
    const dx = enemy.x - unitWorldX
    const dy = enemy.y - unitWorldY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= rangeInPx && enemy.currentHp > highestHp) {
      highestHp = enemy.currentHp
      bestEnemy = enemy
    }
  }

  return bestEnemy
}

// === Buff: 인접 유닛에 버프 적용 (패시브, 매 초 갱신) ===
export const applyPassiveBuffs = (
  allUnits: PlacedUnit[],
  buffs: ActiveBuff[],
): ActiveBuff[] => {
  let newBuffs = [...buffs]

  for (const unit of allUnits) {
    const ability = getUnitAbility(unit.unitDataId)

    if (ability.type === 'buff_atk') {
      const adjacentUnits = getAdjacentUnits(unit.position, allUnits)
      for (const adj of adjacentUnits) {
        newBuffs = addBuff(newBuffs, {
          type: 'atk_boost',
          targetId: adj.instanceId,
          value: ability.params.atkBoost ?? 0.2,
          sourceId: unit.instanceId,
        })
      }
    }

    if (ability.type === 'buff_range') {
      const adjacentUnits = getAdjacentUnits(unit.position, allUnits)
      for (const adj of adjacentUnits) {
        newBuffs = addBuff(newBuffs, {
          type: 'range_boost',
          targetId: adj.instanceId,
          value: ability.params.rangeBoost ?? 0.5,
          sourceId: unit.instanceId,
        })
      }
    }
  }

  return newBuffs
}

// 4방향 인접 유닛 찾기
const getAdjacentUnits = (
  pos: GridPosition,
  allUnits: PlacedUnit[],
): PlacedUnit[] => {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ]

  return allUnits.filter((u) =>
    directions.some(
      (d) => u.position.row === pos.row + d.row && u.position.col === pos.col + d.col,
    ),
  )
}

// === 유닛 능력 타입 확인 ===
export const getAbilityForUnit = (unitDataId: string): AbilityData =>
  getUnitAbility(unitDataId)
