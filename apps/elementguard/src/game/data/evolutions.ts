import type { EvolutionData, EvolutionBranch } from '@/types'

// 10유닛 x 2분기 = 20개 진화 데이터
export const EVOLUTIONS: EvolutionData[] = [
  // === Fire ===
  {
    unitDataId: 'fire-warrior',
    branches: [
      {
        id: 'fire-warrior-berserker',
        name: '버서커',
        unitDataId: 'fire-warrior',
        baseAtk: 21,
        atkSpeed: 1.2,
        range: 1.5,
        bonusEffect: 'atk_up_40',
        description: '공격력 +40%, 공속 +20%, 순수 화력 특화',
      },
      {
        id: 'fire-warrior-paladin',
        name: '팔라딘',
        unitDataId: 'fire-warrior',
        baseAtk: 16.5,
        atkSpeed: 1.0,
        range: 1.5,
        bonusEffect: 'adjacent_atk_buff',
        description: '인접 유닛 공격력 +10% 버프',
      },
    ],
  },
  {
    unitDataId: 'fire-mage',
    branches: [
      {
        id: 'fire-mage-inferno',
        name: '인페르노',
        unitDataId: 'fire-mage',
        baseAtk: 30,
        atkSpeed: 0.7,
        range: 2.5,
        bonusEffect: 'aoe_range_up',
        description: 'AOE 범위 +50%, 쿨다운 -20%',
      },
      {
        id: 'fire-mage-phoenix',
        name: '불사조',
        unitDataId: 'fire-mage',
        baseAtk: 28,
        atkSpeed: 0.6,
        range: 2.0,
        bonusEffect: 'dot_fire',
        description: 'DOT 화염 데미지 추가',
      },
    ],
  },
  // === Water ===
  {
    unitDataId: 'water-guardian',
    branches: [
      {
        id: 'water-guardian-tidal',
        name: '조류 수호자',
        unitDataId: 'water-guardian',
        baseAtk: 14,
        atkSpeed: 0.9,
        range: 1.5,
        bonusEffect: 'slow_enhanced',
        description: '둔화 효과 강화 (50% → 70%)',
      },
      {
        id: 'water-guardian-frost',
        name: '결빙 수호자',
        unitDataId: 'water-guardian',
        baseAtk: 12,
        atkSpeed: 0.8,
        range: 2.0,
        bonusEffect: 'freeze_chance',
        description: '10% 확률로 1초 빙결',
      },
    ],
  },
  {
    unitDataId: 'water-healer',
    branches: [
      {
        id: 'water-healer-priest',
        name: '사제',
        unitDataId: 'water-healer',
        baseAtk: 10,
        atkSpeed: 0.6,
        range: 3.0,
        bonusEffect: 'heal_range_up',
        description: '버프 범위 +50%, 버프 효과 +5%',
      },
      {
        id: 'water-healer-sage',
        name: '현자',
        unitDataId: 'water-healer',
        baseAtk: 14,
        atkSpeed: 0.5,
        range: 2.5,
        bonusEffect: 'atk_buff_enhanced',
        description: '인접 유닛 공격력 버프 +20%',
      },
    ],
  },
  // === Wind ===
  {
    unitDataId: 'wind-archer',
    branches: [
      {
        id: 'wind-archer-storm',
        name: '스톰레인저',
        unitDataId: 'wind-archer',
        baseAtk: 14,
        atkSpeed: 2.0,
        range: 2.5,
        bonusEffect: 'multi_target',
        description: '연사 +33%, 동시 2타겟 공격',
      },
      {
        id: 'wind-archer-shadow',
        name: '쉐도우아처',
        unitDataId: 'wind-archer',
        baseAtk: 18,
        atkSpeed: 1.5,
        range: 2.5,
        bonusEffect: 'crit_up',
        description: '크리티컬 +30%, 크리티컬 데미지 2배',
      },
    ],
  },
  {
    unitDataId: 'wind-assassin',
    branches: [
      {
        id: 'wind-assassin-blade',
        name: '칼날 폭풍',
        unitDataId: 'wind-assassin',
        baseAtk: 42,
        atkSpeed: 0.5,
        range: 1.0,
        bonusEffect: 'execute',
        description: 'HP 20% 이하 적에게 3배 데미지',
      },
      {
        id: 'wind-assassin-phantom',
        name: '환영 암살자',
        unitDataId: 'wind-assassin',
        baseAtk: 35,
        atkSpeed: 0.6,
        range: 1.5,
        bonusEffect: 'pierce',
        description: '공격이 적 1체 관통',
      },
    ],
  },
  // === Thunder ===
  {
    unitDataId: 'thunder-knight',
    branches: [
      {
        id: 'thunder-knight-chain',
        name: '체인마스터',
        unitDataId: 'thunder-knight',
        baseAtk: 20,
        atkSpeed: 0.9,
        range: 2.0,
        bonusEffect: 'chain_enhanced',
        description: '체인 대상 +2, 감소율 -10%',
      },
      {
        id: 'thunder-knight-lord',
        name: '썬더로드',
        unitDataId: 'thunder-knight',
        baseAtk: 22,
        atkSpeed: 0.8,
        range: 2.0,
        bonusEffect: 'stun_chance',
        description: '20% 확률로 0.5초 스턴',
      },
    ],
  },
  {
    unitDataId: 'thunder-sniper',
    branches: [
      {
        id: 'thunder-sniper-railgun',
        name: '레일건',
        unitDataId: 'thunder-sniper',
        baseAtk: 50,
        atkSpeed: 0.25,
        range: 4.0,
        bonusEffect: 'armor_pierce',
        description: '방어력 무시 관통, 초장사거리',
      },
      {
        id: 'thunder-sniper-tesla',
        name: '테슬라',
        unitDataId: 'thunder-sniper',
        baseAtk: 30,
        atkSpeed: 0.5,
        range: 2.5,
        bonusEffect: 'aoe_lightning',
        description: '착탄 시 주변 AOE 번개',
      },
    ],
  },
  // === Earth ===
  {
    unitDataId: 'earth-golem',
    branches: [
      {
        id: 'earth-golem-iron',
        name: '아이언골렘',
        unitDataId: 'earth-golem',
        baseAtk: 10,
        atkSpeed: 0.6,
        range: 1.0,
        bonusEffect: 'slow_aura',
        description: '인접 적 이동속도 -20%',
      },
      {
        id: 'earth-golem-crystal',
        name: '크리스탈골렘',
        unitDataId: 'earth-golem',
        baseAtk: 14,
        atkSpeed: 0.7,
        range: 1.5,
        bonusEffect: 'piercing_atk',
        description: '공격 관통 (최대 2체)',
      },
    ],
  },
  {
    unitDataId: 'earth-shaman',
    branches: [
      {
        id: 'earth-shaman-druid',
        name: '드루이드',
        unitDataId: 'earth-shaman',
        baseAtk: 14,
        atkSpeed: 0.8,
        range: 2.0,
        bonusEffect: 'terrain_boost',
        description: '지형 보너스 효과 2배',
      },
      {
        id: 'earth-shaman-warlock',
        name: '흑마법사',
        unitDataId: 'earth-shaman',
        baseAtk: 18,
        atkSpeed: 0.7,
        range: 2.5,
        bonusEffect: 'debuff_atk',
        description: '공격 시 적 공격력 -15% 디버프',
      },
    ],
  },
]

export const getEvolutionData = (unitDataId: string): EvolutionData | undefined =>
  EVOLUTIONS.find((e) => e.unitDataId === unitDataId)

export const getEvolutionBranch = (evolutionId: string): EvolutionBranch | undefined => {
  for (const evo of EVOLUTIONS) {
    const branch = evo.branches.find((b) => b.id === evolutionId)
    if (branch) return branch
  }
  return undefined
}
