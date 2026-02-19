import type { EnemyData } from '@/types'

export const ENEMIES: EnemyData[] = [
  // 일반 적 (속성별 1종)
  {
    id: 'fire-imp',
    name: '화염 임프',
    element: 'fire',
    baseHp: 50,
    speed: 60,
    reward: 2,
    type: 'normal',
  },
  {
    id: 'water-slime',
    name: '물 슬라임',
    element: 'water',
    baseHp: 60,
    speed: 50,
    reward: 2,
    type: 'normal',
  },
  {
    id: 'wind-bat',
    name: '바람 박쥐',
    element: 'wind',
    baseHp: 40,
    speed: 80,
    reward: 2,
    type: 'normal',
  },
  {
    id: 'thunder-wolf',
    name: '번개 늑대',
    element: 'thunder',
    baseHp: 55,
    speed: 70,
    reward: 2,
    type: 'normal',
  },
  {
    id: 'earth-turtle',
    name: '대지 거북',
    element: 'earth',
    baseHp: 80,
    speed: 40,
    reward: 3,
    type: 'normal',
  },
  // 엘리트 적 (속성별 1종)
  {
    id: 'fire-drake',
    name: '화염 드레이크',
    element: 'fire',
    baseHp: 150,
    speed: 50,
    reward: 5,
    type: 'elite',
  },
  {
    id: 'water-serpent',
    name: '물 뱀',
    element: 'water',
    baseHp: 180,
    speed: 40,
    reward: 5,
    type: 'elite',
  },
  {
    id: 'wind-harpy',
    name: '바람 하피',
    element: 'wind',
    baseHp: 120,
    speed: 90,
    reward: 5,
    type: 'elite',
  },
  {
    id: 'thunder-lion',
    name: '번개 사자',
    element: 'thunder',
    baseHp: 160,
    speed: 60,
    reward: 5,
    type: 'elite',
  },
  {
    id: 'earth-golem-e',
    name: '대지 거인',
    element: 'earth',
    baseHp: 250,
    speed: 30,
    reward: 6,
    type: 'elite',
  },
  // 보스 3종 (W10, W20, W30)
  {
    id: 'boss-inferno',
    name: '지옥의 화신',
    element: 'fire',
    baseHp: 1000,
    speed: 35,
    reward: 30,
    type: 'boss',
    specialAbility: '3초마다 랜덤 유닛 위치에 화염 폭발',
  },
  {
    id: 'boss-leviathan',
    name: '심해의 레비아탄',
    element: 'water',
    baseHp: 1500,
    speed: 25,
    reward: 50,
    type: 'boss',
    specialAbility: '주변 아군 속도 30% 증가, 물 분사로 유닛 둔화',
  },
  {
    id: 'boss-titan',
    name: '대지의 타이탄',
    element: 'earth',
    baseHp: 2500,
    speed: 20,
    reward: 100,
    type: 'boss',
    specialAbility: '지진으로 전체 유닛 0.5초 스턴, 체력 재생',
  },
]

export const getEnemyById = (id: string): EnemyData | undefined =>
  ENEMIES.find((e) => e.id === id)

// 웨이브별 체력 스케일링 (웨이브가 높을수록 적 체력 증가)
export const getWaveHpScale = (wave: number): number =>
  1 + (wave - 1) * 0.15
