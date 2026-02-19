import type { Element, HeroSkillData } from '@/types'

// 5원소 x 2스킬(공격형 + 유틸리티) = 10개
export const HERO_SKILLS: Record<Element, [HeroSkillData, HeroSkillData]> = {
  fire: [
    {
      id: 'fire-explosion',
      name: '화염 폭발',
      element: 'fire',
      type: 'attack',
      damage: 80,
      cooldown: 18,
      range: 120,
      duration: 0,
      description: '주변 적에게 범위 화염 데미지',
    },
    {
      id: 'fire-dash',
      name: '불꽃 질주',
      element: 'fire',
      type: 'utility',
      damage: 0,
      cooldown: 15,
      range: 0,
      duration: 3000,
      description: '3초간 이동속도 2배 증가',
    },
  ],
  water: [
    {
      id: 'water-wave',
      name: '해일',
      element: 'water',
      type: 'attack',
      damage: 60,
      cooldown: 20,
      range: 150,
      duration: 0,
      description: '전방 부채꼴 넉백 + 데미지',
    },
    {
      id: 'water-heal',
      name: '치유의 비',
      element: 'water',
      type: 'utility',
      damage: 0,
      cooldown: 25,
      range: 0,
      duration: 0,
      description: '히어로 HP 30% 회복',
    },
  ],
  wind: [
    {
      id: 'wind-slash',
      name: '진공 베기',
      element: 'wind',
      type: 'attack',
      damage: 70,
      cooldown: 16,
      range: 180,
      duration: 0,
      description: '관통 직선 데미지',
    },
    {
      id: 'wind-wall',
      name: '바람의 벽',
      element: 'wind',
      type: 'utility',
      damage: 0,
      cooldown: 22,
      range: 100,
      duration: 3000,
      description: '3초간 영역 내 적 이동속도 50% 감소',
    },
  ],
  thunder: [
    {
      id: 'thunder-strike',
      name: '낙뢰',
      element: 'thunder',
      type: 'attack',
      damage: 120,
      cooldown: 20,
      range: 200,
      duration: 0,
      description: '단일 대상 고데미지 + 1초 스턴',
    },
    {
      id: 'thunder-field',
      name: '자기장',
      element: 'thunder',
      type: 'utility',
      damage: 0,
      cooldown: 22,
      range: 100,
      duration: 3000,
      description: '3초간 주변 적 공격속도 50% 감소',
    },
  ],
  earth: [
    {
      id: 'earth-quake',
      name: '지진',
      element: 'earth',
      type: 'attack',
      damage: 90,
      cooldown: 20,
      range: 130,
      duration: 0,
      description: '전방 범위 데미지 + 1초 슬로우',
    },
    {
      id: 'earth-shield',
      name: '바위 방패',
      element: 'earth',
      type: 'utility',
      damage: 0,
      cooldown: 25,
      range: 0,
      duration: 5000,
      description: '5초간 피해 감소 50%',
    },
  ],
}

export const getHeroSkills = (element: Element): [HeroSkillData, HeroSkillData] =>
  HERO_SKILLS[element]

// 히어로 기본 스탯
export const HERO_BASE_STATS = {
  maxHp: 200,
  autoAtkDamage: 12, // grade 2 수준 (fire-warrior baseAtk=15, grade2=1.5x → ~22 DPS)
  autoAtkSpeed: 1.0, // 초당 1회
  autoAtkRange: 60, // px
  moveSpeed: 120, // px/sec
  reviveTime: 20, // seconds
  contactDamageRange: 30, // px
  contactDamagePerSec: 10,
} as const
