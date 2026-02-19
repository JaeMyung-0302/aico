import type { UnitData, GradeMultiplier } from '@/types'

// 속성별 2종 (기본공격 + 특수) x 5속성 = 10종
export const UNITS: UnitData[] = [
  // 불(Fire)
  {
    id: 'fire-warrior',
    name: '화염 전사',
    element: 'fire',
    type: 'basic',
    baseAtk: 15,
    atkSpeed: 1.0,
    range: 1.5,
    description: '불꽃을 두른 근접 전사. 안정적인 화력.',
  },
  {
    id: 'fire-mage',
    name: '화염 마법사',
    element: 'fire',
    type: 'special',
    baseAtk: 25,
    atkSpeed: 0.6,
    range: 2.0,
    description: '범위 화염을 발사. 느리지만 강력.',
  },
  // 물(Water)
  {
    id: 'water-guardian',
    name: '물의 수호자',
    element: 'water',
    type: 'basic',
    baseAtk: 10,
    atkSpeed: 0.8,
    range: 1.5,
    description: '적을 둔화시키는 방어형 유닛.',
  },
  {
    id: 'water-healer',
    name: '물의 치유사',
    element: 'water',
    type: 'special',
    baseAtk: 8,
    atkSpeed: 0.5,
    range: 2.5,
    description: '인접 유닛의 공격력을 버프.',
  },
  // 바람(Wind)
  {
    id: 'wind-archer',
    name: '바람의 궁수',
    element: 'wind',
    type: 'basic',
    baseAtk: 12,
    atkSpeed: 1.5,
    range: 2.5,
    description: '빠른 연사. 긴 사거리.',
  },
  {
    id: 'wind-assassin',
    name: '바람의 암살자',
    element: 'wind',
    type: 'special',
    baseAtk: 30,
    atkSpeed: 0.4,
    range: 1.0,
    description: '높은 크리티컬 확률. 짧은 사거리.',
  },
  // 전기(Thunder)
  {
    id: 'thunder-knight',
    name: '번개 기사',
    element: 'thunder',
    type: 'basic',
    baseAtk: 18,
    atkSpeed: 0.8,
    range: 2.0,
    description: '체인 라이트닝으로 다수 공격.',
  },
  {
    id: 'thunder-sniper',
    name: '번개 저격수',
    element: 'thunder',
    type: 'special',
    baseAtk: 35,
    atkSpeed: 0.3,
    range: 3.0,
    description: '초장거리 단일 타격. 매우 느린 공속.',
  },
  // 땅(Earth)
  {
    id: 'earth-golem',
    name: '대지의 골렘',
    element: 'earth',
    type: 'basic',
    baseAtk: 8,
    atkSpeed: 0.6,
    range: 1.0,
    description: '높은 내구도. 근접 전투 특화.',
  },
  {
    id: 'earth-shaman',
    name: '대지의 주술사',
    element: 'earth',
    type: 'special',
    baseAtk: 12,
    atkSpeed: 0.7,
    range: 2.0,
    description: '인접 유닛에게 범위 버프.',
  },
]

// 등급(★)별 공격력 배율
export const GRADE_MULTIPLIERS: GradeMultiplier[] = [
  { grade: 1, atkMultiplier: 1.0 },
  { grade: 2, atkMultiplier: 1.5 },
  { grade: 3, atkMultiplier: 2.5 },
  { grade: 4, atkMultiplier: 4.0 },
  { grade: 5, atkMultiplier: 7.0 },
]

// 소환 시 등급 확률
export const SUMMON_PROBABILITIES: Record<number, number> = {
  1: 0.6, // 60%
  2: 0.3, // 30%
  3: 0.1, // 10%
}

// 소환 비용
export const SUMMON_COST = 10

export const getUnitById = (id: string): UnitData | undefined =>
  UNITS.find((u) => u.id === id)

export const getGradeMultiplier = (grade: number): number =>
  GRADE_MULTIPLIERS.find((g) => g.grade === grade)?.atkMultiplier ?? 1.0
