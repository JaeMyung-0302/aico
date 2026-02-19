import type { Player } from '../entities/Player'
import { calcExpForLevel, MAX_IN_RUN_LEVEL } from '@soulblade/shared'

/**
 * 경험치 테이블 프리컴퓨트 (1~50)
 */
const EXP_TABLE: readonly number[] = Array.from(
  { length: MAX_IN_RUN_LEVEL },
  (_, i) => calcExpForLevel(i + 1),
)

/**
 * 현재 레벨의 필요 경험치 조회
 */
export const getExpForLevel = (level: number): number => {
  if (level < 1 || level > MAX_IN_RUN_LEVEL) return Infinity
  return EXP_TABLE[level - 1] ?? Infinity
}

/**
 * 현재 레벨 진행률 (0~1)
 */
export const getExpProgress = (player: Player): number => {
  if (player.expToNext <= 0) return 1
  return player.exp / player.expToNext
}

/**
 * gold_boost 패시브 적용된 골드 드롭량
 */
export const getGoldDrop = (baseGold: number, player: Player): number => {
  const goldBoostLevel = player.passiveSkills.get('gold_boost') ?? 0
  return Math.floor(baseGold * (1 + goldBoostLevel * 0.15))
}
