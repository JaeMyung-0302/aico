import type { CharacterStats, Equipment, EquipmentTag, SynergyBonus } from '@soulblade/shared'
import { TAG_SYNERGY_CONFIGS } from '@soulblade/shared'

/**
 * 장착 장비의 태그 시너지 보너스 계산
 * 3세트/4세트 활성화 판정
 */
export const calcEquipmentSynergies = (
  equippedItems: readonly Equipment[],
): readonly SynergyBonus[] => {
  // 태그 카운트 집계
  const tagCounts = new Map<EquipmentTag, number>()
  for (const item of equippedItems) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const synergies: SynergyBonus[] = []

  for (const [tag, count] of tagCounts) {
    const config = TAG_SYNERGY_CONFIGS[tag]
    if (count >= 4) {
      synergies.push({ tag, count, bonus: config.fourSetBonus, active: true })
    } else if (count >= 3) {
      synergies.push({ tag, count, bonus: config.threeSetBonus, active: true })
    } else {
      synergies.push({ tag, count, bonus: {}, active: false })
    }
  }

  return synergies
}

/**
 * 장착 장비의 총 스탯 보너스 계산 (개별 스탯 + 시너지)
 */
export const calcTotalEquipmentStats = (
  equippedItems: readonly Equipment[],
): Partial<CharacterStats> & { weaponPower: number } => {
  const total: Record<string, number> = {}
  let weaponPower = 0

  // 개별 장비 스탯 합산
  for (const item of equippedItems) {
    for (const [key, value] of Object.entries(item.stats)) {
      if (typeof value === 'number') {
        total[key] = (total[key] ?? 0) + value
      }
    }
    weaponPower += item.weaponPower ?? 0
  }

  // 시너지 보너스 추가
  const synergies = calcEquipmentSynergies(equippedItems)
  for (const synergy of synergies) {
    if (!synergy.active) continue
    for (const [key, value] of Object.entries(synergy.bonus)) {
      if (typeof value === 'number') {
        total[key] = (total[key] ?? 0) + value
      }
    }
  }

  return { ...(total as Partial<CharacterStats>), weaponPower }
}
