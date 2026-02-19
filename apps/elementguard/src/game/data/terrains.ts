import type { TerrainData } from '@/types'

// 지형 타일 5종
export const TERRAINS: TerrainData[] = [
  {
    type: 'lava',
    name: '용암 지대',
    description: '불 유닛 공격력 +20%',
    buffElement: 'fire',
    effectMultiplier: 1.2,
  },
  {
    type: 'pool',
    name: '물웅덩이',
    description: '물 유닛 공격력 +20%',
    buffElement: 'water',
    effectMultiplier: 1.2,
  },
  {
    type: 'conductor',
    name: '전도체',
    description: '전기 유닛 공격력 +20%',
    buffElement: 'thunder',
    effectMultiplier: 1.2,
  },
  {
    type: 'rock',
    name: '암석',
    description: '땅 유닛 공격력 +20%',
    buffElement: 'earth',
    effectMultiplier: 1.2,
  },
  {
    type: 'gust',
    name: '돌풍 지대',
    description: '바람 유닛 공격력 +20%',
    buffElement: 'wind',
    effectMultiplier: 1.2,
  },
]

// 판당 배치할 지형 칸 수 범위
export const TERRAIN_COUNT_MIN = 3
export const TERRAIN_COUNT_MAX = 5

export const getTerrainByType = (type: string): TerrainData | undefined =>
  TERRAINS.find((t) => t.type === type)
