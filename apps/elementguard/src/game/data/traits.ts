import type { EnemyTrait, TraitConfig } from '@/types'

// 적 특성 기본 설정값
// armored: 받는 데미지 -30%
// fast: 속도 1.8배 (데이터 레벨에서 speed 직접 설정)
// regen: 초당 최대HP의 2% 회복
// swarm: HP 50%, count 3배, reward 1/3 (데이터 레벨에서 직접 설정)
// shielded: 처음 N회 공격 무효

export const TRAIT_CONFIGS: Record<EnemyTrait, TraitConfig> = {
  armored: {
    trait: 'armored',
    value: 0.3, // 30% 데미지 감소
  },
  fast: {
    trait: 'fast',
    value: 1.8, // 속도 1.8배 (참고용, 실제는 enemies.ts에서 speed 직접 설정)
  },
  regen: {
    trait: 'regen',
    value: 0.02, // 초당 최대HP의 2%
  },
  swarm: {
    trait: 'swarm',
    value: 0.5, // HP 50% (참고용, 실제는 enemies.ts에서 직접 설정)
  },
  shielded: {
    trait: 'shielded',
    value: 5, // 처음 5회 공격 무효
  },
}

export const getTraitConfig = (trait: EnemyTrait): TraitConfig =>
  TRAIT_CONFIGS[trait]

// 적이 특정 특성을 가지고 있는지 확인
export const hasTrait = (traits: EnemyTrait[] | undefined, trait: EnemyTrait): boolean =>
  traits?.includes(trait) ?? false

// armor 데미지 감소율 반환 (armored가 아니면 0)
export const getArmorReduction = (traits: EnemyTrait[] | undefined): number =>
  hasTrait(traits, 'armored') ? TRAIT_CONFIGS.armored.value : 0

// regen 비율 반환 (regen이 아니면 0)
export const getRegenRate = (traits: EnemyTrait[] | undefined): number =>
  hasTrait(traits, 'regen') ? TRAIT_CONFIGS.regen.value : 0

// shield 히트 수 반환 (shielded가 아니면 0)
export const getShieldHits = (traits: EnemyTrait[] | undefined): number =>
  hasTrait(traits, 'shielded') ? TRAIT_CONFIGS.shielded.value : 0

// 특성 표시 아이콘 (시각화용)
export const TRAIT_ICONS: Record<EnemyTrait, { emoji: string; color: number }> = {
  armored: { emoji: '🛡️', color: 0x888888 },
  fast: { emoji: '⚡', color: 0xffff44 },
  regen: { emoji: '💚', color: 0x44ff44 },
  swarm: { emoji: '🐜', color: 0xaa8844 },
  shielded: { emoji: '🔵', color: 0x8844ff },
}
