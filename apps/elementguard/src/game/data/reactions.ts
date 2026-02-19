import type { ReactionData, Element } from '@/types'

// 10종 원소 반응 데이터 테이블
export const REACTIONS: ReactionData[] = [
  {
    type: 'steam',
    name: '증기',
    elements: ['fire', 'water'],
    effectType: 'debuff_evasion_zero',
    value: 0,
    duration: 3000,
    description: '회피율 0 고정 3초',
  },
  {
    type: 'firestorm',
    name: '화염폭풍',
    elements: ['fire', 'wind'],
    effectType: 'aoe_damage',
    value: 1.5,
    duration: 0,
    description: '범위 데미지 (ATK 150%)',
  },
  {
    type: 'overload',
    name: '과부하',
    elements: ['fire', 'thunder'],
    effectType: 'single_damage',
    value: 3.0,
    duration: 0,
    description: '단일 대상 즉발 데미지 (ATK 300%)',
  },
  {
    type: 'magma',
    name: '용암류',
    elements: ['fire', 'earth'],
    effectType: 'dot',
    value: 0.5,
    duration: 3000,
    description: '초당 ATK 50% 지속 데미지 3초',
  },
  {
    type: 'blizzard',
    name: '한파',
    elements: ['water', 'wind'],
    effectType: 'aoe_stun',
    value: 0,
    duration: 2000,
    description: '범위 빙결 스턴 2초',
  },
  {
    type: 'electro',
    name: '감전',
    elements: ['water', 'thunder'],
    effectType: 'chain_dot',
    value: 0.8,
    duration: 3000,
    description: 'ATK 80% 전이 지속 데미지 3초',
  },
  {
    type: 'swamp_reaction',
    name: '늪',
    elements: ['water', 'earth'],
    effectType: 'mega_slow',
    value: 0.7,
    duration: 5000,
    description: '이동속도 -70% 5초',
  },
  {
    type: 'thunderstorm',
    name: '낙뢰',
    elements: ['wind', 'thunder'],
    effectType: 'random_chain_damage',
    value: 1.2,
    duration: 0,
    description: '랜덤 3체 타겟 ATK 120% 데미지',
  },
  {
    type: 'sandstorm',
    name: '모래폭풍',
    elements: ['wind', 'earth'],
    effectType: 'aoe_atk_reduce',
    value: 0.3,
    duration: 4000,
    description: '범위 공격력 -30% 4초',
  },
  {
    type: 'quake',
    name: '지진',
    elements: ['thunder', 'earth'],
    effectType: 'stun_armor_break',
    value: 0.5,
    duration: 3000,
    description: '범위 스턴 1초 + 방어력 -50% 3초',
  },
]

// 원소 쌍 → 반응 데이터 조회 맵
const reactionMap = new Map<string, ReactionData>()

const makeKey = (a: Element, b: Element): string =>
  [a, b].sort().join('+')

for (const reaction of REACTIONS) {
  reactionMap.set(makeKey(reaction.elements[0], reaction.elements[1]), reaction)
}

export const getReaction = (a: Element, b: Element): ReactionData | undefined =>
  reactionMap.get(makeKey(a, b))
