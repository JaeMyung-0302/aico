import type { Skill, Element } from '@monster-factory/shared'

// 기본 공격 (스킬 없는 경우 fallback, element는 동적 할당)
const DEFAULT_ATTACK: Omit<Skill, 'element'> = {
  id: 'default',
  name: 'Basic Attack',
  category: 'physical',
  power: 1.0,
  accuracy: 1.0,
  cooldown: 0,
  description: null,
}

/**
 * 쿨다운 기반 스킬 자동 선택
 * 가장 power 높은 스킬 중 사용 가능한 것을 선택.
 * 모두 쿨다운이면 기본 공격 반환.
 */
export const selectSkill = (
  skills: Skill[],
  cooldownMap: Map<string, number>,
  attackerElement: Element,
): Skill => {
  if (skills.length === 0) return { ...DEFAULT_ATTACK, element: attackerElement }

  // 사용 가능한 스킬 필터 (쿨다운 0이거나 맵에 없는 것)
  const available = skills.filter((s) => {
    const remaining = cooldownMap.get(s.id) ?? 0
    return remaining <= 0
  })

  if (available.length === 0) return { ...DEFAULT_ATTACK, element: attackerElement }

  // power 내림차순 정렬 후 첫 번째 선택
  const sorted = [...available].sort((a, b) => b.power - a.power)
  return sorted[0]!
}

/**
 * 스킬 사용 후 쿨다운 설정 + 전체 쿨다운 1턴 감소
 */
export const updateCooldowns = (
  cooldownMap: Map<string, number>,
  usedSkill: Skill,
): Map<string, number> => {
  const updated = new Map(cooldownMap)

  // 모든 쿨다운 1턴 감소
  for (const [id, remaining] of updated) {
    if (remaining > 0) {
      updated.set(id, remaining - 1)
    }
  }

  // 사용한 스킬 쿨다운 설정
  if (usedSkill.cooldown > 0) {
    updated.set(usedSkill.id, usedSkill.cooldown)
  }

  return updated
}
