import type { Element, FusionElement, FusionUnitData } from '@/types'

// 융합 조합표: 2개의 다른 속성 → 융합 속성
export const FUSION_MAP: Record<string, FusionElement> = {
  'fire+thunder': 'plasma',
  'thunder+fire': 'plasma',
  'water+wind': 'frost',
  'wind+water': 'frost',
  'fire+earth': 'lava',
  'earth+fire': 'lava',
  'wind+thunder': 'storm',
  'thunder+wind': 'storm',
  'earth+water': 'swamp',
  'water+earth': 'swamp',
  'fire+wind': 'heatwave',
  'wind+fire': 'heatwave',
}

// 융합 유닛 데이터 6종
export const FUSION_UNITS: FusionUnitData[] = [
  {
    id: 'fusion-plasma',
    name: '플라즈마',
    fusionElement: 'plasma',
    elements: ['fire', 'thunder'],
    baseAtk: 40,
    atkSpeed: 0.7,
    range: 2.5,
    description: '전기 + 불의 융합. 바람과 땅에 유리.',
  },
  {
    id: 'fusion-frost',
    name: '서리',
    fusionElement: 'frost',
    elements: ['water', 'wind'],
    baseAtk: 30,
    atkSpeed: 0.9,
    range: 2.0,
    description: '물 + 바람의 융합. 불과 전기에 유리.',
  },
  {
    id: 'fusion-lava',
    name: '용암',
    fusionElement: 'lava',
    elements: ['fire', 'earth'],
    baseAtk: 35,
    atkSpeed: 0.5,
    range: 1.5,
    description: '불 + 땅의 융합. 바람과 물에 유리.',
  },
  {
    id: 'fusion-storm',
    name: '폭풍',
    fusionElement: 'storm',
    elements: ['wind', 'thunder'],
    baseAtk: 28,
    atkSpeed: 1.2,
    range: 2.5,
    description: '바람 + 전기의 융합. 전기와 땅에 유리.',
  },
  {
    id: 'fusion-swamp',
    name: '습지',
    fusionElement: 'swamp',
    elements: ['earth', 'water'],
    baseAtk: 22,
    atkSpeed: 0.6,
    range: 2.0,
    description: '땅 + 물의 융합. 물과 불에 유리. 적 둔화 효과.',
  },
  {
    id: 'fusion-heatwave',
    name: '열풍',
    fusionElement: 'heatwave',
    elements: ['fire', 'wind'],
    baseAtk: 32,
    atkSpeed: 1.0,
    range: 2.0,
    description: '불 + 바람의 융합. 바람과 전기에 유리.',
  },
]

// 융합 확률
export const BASE_FUSION_CHANCE = 0.7

// 융합 유닛의 이중 상성: 양쪽 속성의 유리 속성을 모두 가짐
export const FUSION_ADVANTAGES: Record<FusionElement, Element[]> = {
  plasma: ['wind', 'earth'],     // Fire→Wind, Thunder→Earth
  frost: ['fire', 'thunder'],    // Water→Fire, Wind→Thunder
  lava: ['wind', 'water'],       // Fire→Wind, Earth→Water
  storm: ['thunder', 'earth'],   // Wind→Thunder, Thunder→Earth
  swamp: ['water', 'fire'],      // Earth→Water, Water→Fire
  heatwave: ['wind', 'thunder'], // Fire→Wind, Wind→Thunder
}

export const getFusionResult = (elem1: Element, elem2: Element): FusionElement | undefined =>
  FUSION_MAP[`${elem1}+${elem2}`]

export const getFusionUnit = (fusionElement: FusionElement): FusionUnitData | undefined =>
  FUSION_UNITS.find((f) => f.fusionElement === fusionElement)
