import type { MapId, WorldMapConfig } from '@soulblade/shared'
import { VILLAGE_MAP } from './village'
import { SERPENT_FOREST_MAP } from './serpent-forest'
import { ICE_CAVE_MAP } from './ice-cave'
import { FLAME_CASTLE_MAP } from './flame-castle'

export const MAP_CONFIGS: Record<MapId, WorldMapConfig> = {
  town: VILLAGE_MAP,
  serpent_forest: SERPENT_FOREST_MAP,
  ice_cave: ICE_CAVE_MAP,
  flame_castle: FLAME_CASTLE_MAP,
}
