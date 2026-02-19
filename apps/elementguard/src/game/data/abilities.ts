import type { AbilityData } from '@/types'

// 유닛별 고유 능력 정의
// none: 기본 공격만 (능력 없음)
// aoe: 타겟 주변 적에게 범위 데미지 (radius: 칸, damageFalloff: 비율)
// slow: 타겟 감속 (slowPercent: 0~1, durationMs: 밀리초)
// buff_atk: 인접 유닛 공격력 버프 (atkBoost: 비율, range: 칸)
// buff_range: 인접 유닛 사거리 버프 (rangeBoost: 칸, range: 칸)
// chain: 타겟 주변 적 1기에 추가 데미지 (chainRadius: 칸, chainDamageRatio: 비율)
// pierce: 경로 뒤쪽 적 1기에 추가 데미지 (pierceDamageRatio: 비율)
// prioritize_hp: 가장 HP 높은 적 우선 타겟 (파라미터 없음)
// debuff_armor: 타겟 방어력 감소 (armorBreak: 추가 피격 비율, durationMs: 밀리초)

export const UNIT_ABILITIES: Record<string, AbilityData> = {
  // 불(Fire)
  'fire-warrior': {
    type: 'none',
    params: {},
  },
  'fire-mage': {
    type: 'aoe',
    params: { radius: 1.5, damageFalloff: 0.5 },
  },

  // 물(Water)
  'water-guardian': {
    type: 'slow',
    params: { slowPercent: 0.3, durationMs: 2000 },
  },
  'water-healer': {
    type: 'buff_atk',
    params: { atkBoost: 0.2, range: 1 },
  },

  // 바람(Wind)
  'wind-archer': {
    type: 'none',
    params: {},
  },
  'wind-assassin': {
    type: 'prioritize_hp',
    params: {},
  },

  // 전기(Thunder)
  'thunder-knight': {
    type: 'chain',
    params: { chainRadius: 1, chainDamageRatio: 0.5 },
  },
  'thunder-sniper': {
    type: 'pierce',
    params: { pierceDamageRatio: 0.7 },
  },

  // 땅(Earth)
  'earth-golem': {
    type: 'debuff_armor',
    params: { armorBreak: 0.2, durationMs: 3000 },
  },
  'earth-shaman': {
    type: 'buff_range',
    params: { rangeBoost: 0.5, range: 1 },
  },
}

export const getUnitAbility = (unitDataId: string): AbilityData =>
  UNIT_ABILITIES[unitDataId] ?? { type: 'none', params: {} }
