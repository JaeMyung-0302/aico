import type { ShopItem, ForgeRecipe } from '@soulblade/shared'

// 상점 아이템 목록
export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'potion_small',
    name: '소형 포션',
    description: 'HP 30 회복',
    cost: 20,
    effect: { hp: 30 },
  },
  {
    id: 'potion_large',
    name: '대형 포션',
    description: 'HP 80 회복',
    cost: 50,
    effect: { hp: 80 },
  },
  {
    id: 'buff_atk',
    name: '공격력 부적',
    description: '공격력 +5 (영구)',
    cost: 100,
    effect: { atk: 5 },
  },
  {
    id: 'buff_def',
    name: '방어력 부적',
    description: '방어력 +5 (영구)',
    cost: 100,
    effect: { def: 5 },
  },
  {
    id: 'buff_spd',
    name: '속도 부적',
    description: '이동속도 +2 (영구)',
    cost: 80,
    effect: { spd: 2 },
  },
]

// 대장간 강화 레시피
export const FORGE_RECIPES: readonly ForgeRecipe[] = [
  {
    id: 'forge_atk_1',
    name: '무기 강화 I',
    description: '공격력 +8',
    cost: 150,
    statBoost: { atk: 8 },
  },
  {
    id: 'forge_def_1',
    name: '방어구 강화 I',
    description: '방어력 +8',
    cost: 150,
    statBoost: { def: 8 },
  },
  {
    id: 'forge_hp_1',
    name: '생명력 강화 I',
    description: 'HP +30',
    cost: 120,
    statBoost: { hp: 30 },
  },
  {
    id: 'forge_crit_1',
    name: '치명타 강화 I',
    description: '크리티컬 확률 +3%',
    cost: 200,
    statBoost: { crit: 0.03 },
  },
]
