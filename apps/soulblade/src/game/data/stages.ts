import type { StageId, StageConfig } from '@soulblade/shared'
import { SERPENT_FOREST_CONFIG } from './stage-serpent-forest'
import { ICE_CAVE_CONFIG } from './stage-ice-cave'
import { FLAME_CASTLE_CONFIG } from './stage-flame-castle'

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  serpent_forest: SERPENT_FOREST_CONFIG,
  ice_cave: ICE_CAVE_CONFIG,
  flame_castle: FLAME_CASTLE_CONFIG,
}

// 스테이지별 배경색 (타일맵 대체)
export const STAGE_BACKGROUNDS: Record<StageId, { color: string; name: string }> = {
  serpent_forest: { color: '#1a2e1a', name: '뱀저숲' },
  ice_cave: { color: '#1a2e3e', name: '얼음동굴' },
  flame_castle: { color: '#3e1a1a', name: '화염성' },
}
