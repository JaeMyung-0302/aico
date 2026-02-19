import type { PassiveSkillId, SkillEvolution } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'

// 8종 진화 스킬 정의
const EVOLUTIONS: readonly SkillEvolution[] = [
  {
    id: 'evo_flame_storm',
    name: '화염 폭풍',
    description: '화상 + AoE → 화면 전체 화염 데미지',
    requiredActiveSkillId: 'mage_meteor',
    requiredPassiveSkillId: 'burn_dot',
    evolvedSkillEffect: { dmgMultiplier: 3.0, aoeRadius: 300 },
  },
  {
    id: 'evo_frozen_blade',
    name: '얼음 검',
    description: '냉기 오라 + 근접 → 적 빙결 + 크리티컬 보장',
    requiredActiveSkillId: 'warrior_whirlwind',
    requiredPassiveSkillId: 'frozen_aura',
    evolvedSkillEffect: { freezeDuration: 2.0, guaranteedCrit: 1 },
  },
  {
    id: 'evo_holy_rain',
    name: '성스러운 비',
    description: '성스러운 방패 + 원거리 → 관통 + 아군 힐',
    requiredActiveSkillId: 'archer_rain',
    requiredPassiveSkillId: 'holy_shield',
    evolvedSkillEffect: { piercing: 1, healOnHit: 5 },
  },
  {
    id: 'evo_judgment_lightning',
    name: '심판의 번개',
    description: '연쇄 번개 + 팔라딘 → 광역 체인 데미지',
    requiredActiveSkillId: 'paladin_judgment',
    requiredPassiveSkillId: 'chain_lightning',
    evolvedSkillEffect: { chainCount: 5, dmgMultiplier: 2.0 },
  },
  {
    id: 'evo_blood_rain',
    name: '피의 비',
    description: '흡혈 + 원거리 → 적중 시 대량 HP 흡수',
    requiredActiveSkillId: 'archer_rain',
    requiredPassiveSkillId: 'vampire_touch',
    evolvedSkillEffect: { lifestealPercent: 0.15, dmgMultiplier: 1.5 },
  },
  {
    id: 'evo_thorn_whirlwind',
    name: '가시 회전',
    description: '가시 갑옷 + 근접 → 반사 데미지 AoE',
    requiredActiveSkillId: 'warrior_whirlwind',
    requiredPassiveSkillId: 'thorn_armor',
    evolvedSkillEffect: { reflectMultiplier: 3.0, aoeRadius: 150 },
  },
  {
    id: 'evo_meteor_poison',
    name: '독운석',
    description: '관통 + 마법 → 지속 독 데미지 지대',
    requiredActiveSkillId: 'mage_meteor',
    requiredPassiveSkillId: 'pierce_shot',
    evolvedSkillEffect: { dotDuration: 5.0, dmgPerSec: 10 },
  },
  {
    id: 'evo_divine_dodge',
    name: '신성 회피',
    description: '회피 + 팔라딘 → 회피 시 무적 + 반격',
    requiredActiveSkillId: 'paladin_judgment',
    requiredPassiveSkillId: 'dodge_chance',
    evolvedSkillEffect: { counterDmgMultiplier: 2.0, invincibleMs: 500 },
  },
]

/**
 * 진화 가능 여부 체크
 * 액티브 스킬 레벨 ≥ 5 + 패시브 스킬 레벨 ≥ 5 → 진화 제시
 */
export const checkEvolutions = (
  activeSkillId: string,
  activeSkillLevel: number,
  passiveSkills: ReadonlyMap<PassiveSkillId, number>,
  alreadyEvolved: ReadonlySet<string>,
): SkillEvolution | null => {
  if (activeSkillLevel < 5) return null

  for (const evo of EVOLUTIONS) {
    if (alreadyEvolved.has(evo.id)) continue
    if (evo.requiredActiveSkillId !== activeSkillId) continue

    const passiveLevel = passiveSkills.get(evo.requiredPassiveSkillId) ?? 0
    if (passiveLevel >= 5) {
      return evo
    }
  }

  return null
}

/**
 * 진화 적용 후 이벤트 emit
 */
export const emitEvolutionAvailable = (evolution: SkillEvolution): void => {
  eventBus.emit('evolution:available', { evolution })
}

/**
 * 모든 진화 목록 조회 (UI 참조용)
 */
export const getAllEvolutions = (): readonly SkillEvolution[] => EVOLUTIONS
