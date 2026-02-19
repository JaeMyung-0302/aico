import type { PassiveSkillId, InRunSkillChoice, PassiveSkill } from '@soulblade/shared'

// 20종 패시브 스킬 정의
const PASSIVE_SKILLS: Record<PassiveSkillId, PassiveSkill> = {
  atk_boost: { id: 'atk_boost', name: '공격력 강화', description: '공격력 +3', maxLevel: 5, effectPerLevel: { atk: 3 }, icon: '⚔️' },
  def_boost: { id: 'def_boost', name: '방어력 강화', description: '방어력 +2', maxLevel: 5, effectPerLevel: { def: 2 }, icon: '🛡️' },
  hp_boost: { id: 'hp_boost', name: '체력 강화', description: 'HP +15', maxLevel: 5, effectPerLevel: { hp: 15 }, icon: '❤️' },
  spd_boost: { id: 'spd_boost', name: '이동속도 강화', description: '이동속도 +1', maxLevel: 5, effectPerLevel: { spd: 1 }, icon: '💨' },
  crit_boost: { id: 'crit_boost', name: '크리티컬 강화', description: '크리 확률 +3%', maxLevel: 5, effectPerLevel: { crit: 0.03 }, icon: '🎯' },
  crit_dmg_boost: { id: 'crit_dmg_boost', name: '크리 피해 강화', description: '크리 피해 +15%', maxLevel: 5, effectPerLevel: { critDmg: 0.15 }, icon: '💥' },
  extra_projectile: { id: 'extra_projectile', name: '추가 투사체', description: '투사체 +1개', maxLevel: 3, effectPerLevel: { projectiles: 1 }, icon: '🏹' },
  aoe_range_up: { id: 'aoe_range_up', name: '범위 확대', description: '범위 +20', maxLevel: 3, effectPerLevel: { range: 20 }, icon: '🔵' },
  vampire_touch: { id: 'vampire_touch', name: '흡혈', description: '처치 시 HP 2% 회복', maxLevel: 5, effectPerLevel: { vampireHeal: 0.02 }, icon: '🧛' },
  thorn_armor: { id: 'thorn_armor', name: '가시 갑옷', description: '피격 시 적 ATK 10% 반사', maxLevel: 3, effectPerLevel: { reflect: 0.1 }, icon: '🌵' },
  dodge_chance: { id: 'dodge_chance', name: '회피', description: '회피 확률 5%', maxLevel: 3, effectPerLevel: { dodge: 0.05 }, icon: '💫' },
  exp_boost: { id: 'exp_boost', name: '경험치 부스트', description: '경험치 +10%', maxLevel: 5, effectPerLevel: { expBoost: 0.1 }, icon: '📖' },
  gold_boost: { id: 'gold_boost', name: '골드 부스트', description: '골드 +15%', maxLevel: 5, effectPerLevel: { goldBoost: 0.15 }, icon: '💰' },
  cooldown_reduction: { id: 'cooldown_reduction', name: '쿨타임 감소', description: '공격 쿨타임 -8%', maxLevel: 5, effectPerLevel: { cdr: 0.08 }, icon: '⏰' },
  attack_speed_up: { id: 'attack_speed_up', name: '공격속도 강화', description: '공격속도 +10%', maxLevel: 5, effectPerLevel: { atkSpd: 0.1 }, icon: '⚡' },
  pierce_shot: { id: 'pierce_shot', name: '관통', description: '투사체가 적을 관통', maxLevel: 1, effectPerLevel: { pierce: 1 }, icon: '🔱' },
  chain_lightning: { id: 'chain_lightning', name: '연쇄 번개', description: '처치 시 주변 적에게 번개', maxLevel: 3, effectPerLevel: { chainDmg: 5 }, icon: '⚡' },
  frozen_aura: { id: 'frozen_aura', name: '빙결 오라', description: '주변 적 이동속도 -15%', maxLevel: 3, effectPerLevel: { slowPercent: 0.15 }, icon: '❄️' },
  burn_dot: { id: 'burn_dot', name: '화상', description: '공격 시 3초간 DoT', maxLevel: 3, effectPerLevel: { dotDmg: 2 }, icon: '🔥' },
  holy_shield: { id: 'holy_shield', name: '성스러운 방패', description: '30초마다 피해 1회 무효', maxLevel: 3, effectPerLevel: { shieldInterval: 30 }, icon: '✨' },
}

const ALL_SKILL_IDS: readonly PassiveSkillId[] = Object.keys(PASSIVE_SKILLS) as PassiveSkillId[]

/**
 * 레벨업 시 3지선다 스킬 생성
 * - 이미 max 레벨인 스킬 제외
 * - 중복 없이 3개 선택
 */
export const generateSkillChoices = (
  currentSkills: ReadonlyMap<PassiveSkillId, number>,
): readonly InRunSkillChoice[] => {
  const available = ALL_SKILL_IDS.filter((id) => {
    const currentLevel = currentSkills.get(id) ?? 0
    return currentLevel < PASSIVE_SKILLS[id].maxLevel
  })

  // 셔플 후 최대 3개
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const chosen = shuffled.slice(0, 3)

  return chosen.map((skillId) => ({
    skillId,
    currentLevel: currentSkills.get(skillId) ?? 0,
    nextLevel: (currentSkills.get(skillId) ?? 0) + 1,
  }))
}

/**
 * 스킬 ID로 스킬 정보 조회
 */
export const getPassiveSkill = (id: PassiveSkillId): PassiveSkill => {
  return PASSIVE_SKILLS[id]
}

export { PASSIVE_SKILLS }
