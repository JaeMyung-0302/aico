import type { ChallengeMode, StageId } from '@soulblade/shared'

// 도전 모드 설정
export interface ChallengeConfig {
  readonly mode: ChallengeMode
  readonly name: string
  readonly description: string
  readonly stageId: StageId
  readonly rules: ChallengeRules
}

export interface ChallengeRules {
  readonly durationOverride: number | null // 초 (null = 스테이지 기본)
  readonly spawnRateMultiplier: number
  readonly bossOnly: boolean
  readonly restrictedSkills: boolean // true = 패시브 스킬 획득 불가
  readonly monsterHpMultiplier: number
}

export const CHALLENGE_CONFIGS: readonly ChallengeConfig[] = [
  {
    mode: 'time_attack',
    name: '타임 어택',
    description: '5분 안에 최대한 많이 처치하라',
    stageId: 'serpent_forest',
    rules: {
      durationOverride: 300,
      spawnRateMultiplier: 2.0,
      bossOnly: false,
      restrictedSkills: false,
      monsterHpMultiplier: 0.7,
    },
  },
  {
    mode: 'infinite',
    name: '무한 모드',
    description: '끝없는 몬스터, 얼마나 버틸 수 있는가',
    stageId: 'flame_castle',
    rules: {
      durationOverride: null,
      spawnRateMultiplier: 1.5,
      bossOnly: false,
      restrictedSkills: false,
      monsterHpMultiplier: 1.0,
    },
  },
  {
    mode: 'boss_rush',
    name: '보스 러시',
    description: '보스만 연속으로 등장한다',
    stageId: 'ice_cave',
    rules: {
      durationOverride: 600,
      spawnRateMultiplier: 0.3,
      bossOnly: true,
      restrictedSkills: false,
      monsterHpMultiplier: 1.0,
    },
  },
  {
    mode: 'restricted',
    name: '제한 모드',
    description: '스킬 획득 불가, 순수 기본 스탯으로 생존',
    stageId: 'serpent_forest',
    rules: {
      durationOverride: 600,
      spawnRateMultiplier: 1.0,
      bossOnly: false,
      restrictedSkills: true,
      monsterHpMultiplier: 0.8,
    },
  },
]

/**
 * 도전 모드 설정 조회
 */
export const getChallengeConfig = (mode: ChallengeMode): ChallengeConfig | null => {
  return CHALLENGE_CONFIGS.find((c) => c.mode === mode) ?? null
}
