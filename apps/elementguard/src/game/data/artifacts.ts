import type { ArtifactData } from '@/types'

// 유물 30종 (6카테고리 x 5개)
export const ARTIFACTS: ArtifactData[] = [
  // === 공격 (attack) ===
  { id: 'atk-blade', name: '날카로운 검', category: 'attack', rarity: 'common', description: '전체 유닛 공격력 +10%', effect: { type: 'atk_percent', value: 0.1, target: 'all' } },
  { id: 'atk-fire-ring', name: '화염의 반지', category: 'attack', rarity: 'rare', description: '불 유닛 공격력 +25%', effect: { type: 'atk_percent', value: 0.25, target: 'fire' } },
  { id: 'atk-speed-glove', name: '속사 장갑', category: 'attack', rarity: 'common', description: '전체 유닛 공격속도 +15%', effect: { type: 'atk_speed', value: 0.15, target: 'all' } },
  { id: 'atk-crit-amulet', name: '치명의 부적', category: 'attack', rarity: 'rare', description: '크리티컬 확률 +20%', effect: { type: 'crit_chance', value: 0.2 } },
  { id: 'atk-rage', name: '광전사의 분노', category: 'attack', rarity: 'epic', description: '공격력 +20%, 공격속도 +10%', effect: { type: 'atk_rage', value: 0.2 } },

  // === 방어 (defense) ===
  { id: 'def-shield', name: '강철 방패', category: 'defense', rarity: 'common', description: '기지 최대 HP +20', effect: { type: 'max_hp', value: 20 } },
  { id: 'def-regen', name: '재생의 오브', category: 'defense', rarity: 'rare', description: '웨이브마다 HP 5 회복', effect: { type: 'hp_regen', value: 5 } },
  { id: 'def-thorns', name: '가시 갑옷', category: 'defense', rarity: 'common', description: '적 접촉 시 최대HP 2% 반사 데미지', effect: { type: 'thorns', value: 0.02 } },
  { id: 'def-slow-aura', name: '둔화의 오라', category: 'defense', rarity: 'rare', description: '모든 적 이동속도 -10%', effect: { type: 'enemy_slow', value: 0.1 } },
  { id: 'def-fortress', name: '난공불락', category: 'defense', rarity: 'epic', description: '기지 HP +30, 웨이브당 HP 3 회복', effect: { type: 'fortress', value: 30 } },

  // === 경제 (economy) ===
  { id: 'eco-coin', name: '황금 동전', category: 'economy', rarity: 'common', description: '웨이브 보상 골드 +20%', effect: { type: 'gold_bonus', value: 0.2 } },
  { id: 'eco-merchant', name: '상인의 지혜', category: 'economy', rarity: 'rare', description: '소환 비용 -2 골드', effect: { type: 'summon_discount', value: 2 } },
  { id: 'eco-interest', name: '이자의 돌', category: 'economy', rarity: 'rare', description: '보유 골드 10당 +1 골드 (웨이브마다)', effect: { type: 'interest', value: 0.1 } },
  { id: 'eco-bounty', name: '현상금 사냥꾼', category: 'economy', rarity: 'common', description: '엘리트 처치 골드 +50%', effect: { type: 'elite_bounty', value: 0.5 } },
  { id: 'eco-midas', name: '미다스의 손', category: 'economy', rarity: 'epic', description: '소환 비용 -3, 웨이브 골드 +30%', effect: { type: 'midas', value: 3 } },

  // === 속성 (element) ===
  { id: 'elem-water-boost', name: '파도의 축복', category: 'element', rarity: 'common', description: '물 유닛 공격력 +20%', effect: { type: 'atk_percent', value: 0.2, target: 'water' } },
  { id: 'elem-thunder-boost', name: '전격의 축복', category: 'element', rarity: 'common', description: '전기 유닛 공격력 +20%', effect: { type: 'atk_percent', value: 0.2, target: 'thunder' } },
  { id: 'elem-wind-boost', name: '질풍의 축복', category: 'element', rarity: 'common', description: '바람 유닛 공격력 +20%', effect: { type: 'atk_percent', value: 0.2, target: 'wind' } },
  { id: 'elem-earth-boost', name: '대지의 축복', category: 'element', rarity: 'common', description: '땅 유닛 공격력 +20%', effect: { type: 'atk_percent', value: 0.2, target: 'earth' } },
  { id: 'elem-mastery', name: '속성 마스터', category: 'element', rarity: 'epic', description: '상성 유리 배율 x1.5 → x1.8', effect: { type: 'advantage_boost', value: 0.3 } },

  // === 시너지 (synergy) ===
  { id: 'syn-duo', name: '듀오의 힘', category: 'synergy', rarity: 'common', description: '같은 속성 2유닛 인접 시 공격력 +10%', effect: { type: 'duo_bonus', value: 0.1 } },
  { id: 'syn-trio', name: '트리오의 공명', category: 'synergy', rarity: 'rare', description: '시너지 보너스 +50% 강화', effect: { type: 'synergy_boost', value: 0.5 } },
  { id: 'syn-rainbow', name: '무지개 빛', category: 'synergy', rarity: 'rare', description: '5속성 모두 배치 시 전체 공격력 +15%', effect: { type: 'rainbow_bonus', value: 0.15 } },
  { id: 'syn-fusion-boost', name: '융합 촉진제', category: 'synergy', rarity: 'rare', description: '융합 확률 70% → 90%', effect: { type: 'fusion_chance', value: 0.2 } },
  { id: 'syn-chain', name: '연쇄의 고리', category: 'synergy', rarity: 'epic', description: '인접 유닛 수 x5% 추가 공격력', effect: { type: 'chain_bonus', value: 0.05 } },

  // === 특수 (special) ===
  { id: 'spc-lucky', name: '행운의 클로버', category: 'special', rarity: 'rare', description: '★3 소환 확률 +5%', effect: { type: 'summon_luck', value: 0.05 } },
  { id: 'spc-reroll', name: '운명의 주사위', category: 'special', rarity: 'common', description: '유물 선택 시 1회 리롤 가능', effect: { type: 'artifact_reroll', value: 1 } },
  { id: 'spc-exp-boost', name: '지식의 서', category: 'special', rarity: 'common', description: '경험치 획득 +25%', effect: { type: 'exp_boost', value: 0.25 } },
  { id: 'spc-terrain-master', name: '지형 정복자', category: 'special', rarity: 'rare', description: '지형 효과 배율 +50%', effect: { type: 'terrain_boost', value: 0.5 } },
  { id: 'spc-final-stand', name: '최후의 저항', category: 'special', rarity: 'epic', description: 'HP 0 시 1회 부활 (HP 30%)', effect: { type: 'revive', value: 0.3 } },
]

export const getArtifactById = (id: string): ArtifactData | undefined =>
  ARTIFACTS.find((a) => a.id === id)

export const getArtifactsByCategory = (category: string): ArtifactData[] =>
  ARTIFACTS.filter((a) => a.category === category)
