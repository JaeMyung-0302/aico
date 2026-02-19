import type { Element, FusionElement } from '@/types'
import { FUSION_ADVANTAGES } from '@/game/data/fusions'

// 상성 순환: 불→바람→전기→땅→물→불
const ADVANTAGE_MAP: Record<Element, Element> = {
  fire: 'wind',
  wind: 'thunder',
  thunder: 'earth',
  earth: 'water',
  water: 'fire',
}

const DISADVANTAGE_MAP: Record<Element, Element> = {
  fire: 'water',
  water: 'earth',
  earth: 'thunder',
  thunder: 'wind',
  wind: 'fire',
}

// 데미지 배율
const ADVANTAGE_MULTIPLIER = 1.5
const NEUTRAL_MULTIPLIER = 1.0
const DISADVANTAGE_MULTIPLIER = 0.7

// 기본 속성 상성 계산
export const getElementMultiplier = (attacker: Element, defender: Element): number => {
  if (ADVANTAGE_MAP[attacker] === defender) return ADVANTAGE_MULTIPLIER
  if (DISADVANTAGE_MAP[attacker] === defender) return DISADVANTAGE_MULTIPLIER
  return NEUTRAL_MULTIPLIER
}

// 융합 속성의 이중 상성 계산 (두 속성 중 유리한 쪽 적용)
export const getFusionElementMultiplier = (
  fusionElement: FusionElement,
  defender: Element,
): number => {
  const advantages = FUSION_ADVANTAGES[fusionElement]
  if (!advantages) return NEUTRAL_MULTIPLIER

  if (advantages.includes(defender)) return ADVANTAGE_MULTIPLIER
  return NEUTRAL_MULTIPLIER
}

// 상성 정보 조회
export const getAdvantageElement = (element: Element): Element =>
  ADVANTAGE_MAP[element]

export const getDisadvantageElement = (element: Element): Element =>
  DISADVANTAGE_MAP[element]

// 속성 배열
export const ALL_ELEMENTS: Element[] = ['fire', 'water', 'wind', 'thunder', 'earth']

// 속성 색상 매핑
export const ELEMENT_COLORS: Record<Element, number> = {
  fire: 0xff4444,
  water: 0x4488ff,
  wind: 0x44ff88,
  thunder: 0xffff44,
  earth: 0x886644,
}

export const FUSION_COLORS: Record<FusionElement, number> = {
  plasma: 0xff88ff,
  frost: 0x88ddff,
  lava: 0xff6600,
  storm: 0x88ffaa,
  swamp: 0x448844,
  heatwave: 0xff8844,
}
