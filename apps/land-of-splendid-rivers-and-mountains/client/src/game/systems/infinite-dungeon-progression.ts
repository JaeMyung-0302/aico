export interface FloorDifficulty {
  readonly floor: number;
  readonly monsterHpMultiplier: number;
  readonly monsterAttackMultiplier: number;
  readonly goldMultiplier: number;
  readonly isBoss: boolean;
  readonly lootPool: ReadonlyArray<string>;
}

export interface MilestoneFloorReward {
  readonly floor: number;
  readonly titleKey: string;
  readonly itemId: string;
  readonly quantity: number;
}

export const HP_MULT_PER_FLOOR = 0.15;
export const ATK_MULT_PER_FLOOR = 0.1;
export const GOLD_MULT_PER_FLOOR = 0.08;
export const BOSS_FLOOR_INTERVAL = 5;

const BASE_LOOT: ReadonlyArray<string> = [
  "drop-wild-herb",
  "drop-monster-hide",
];
const DEEP_LOOT: ReadonlyArray<string> = [...BASE_LOOT, "drop-rare-shard"];
const BOSS_LOOT: ReadonlyArray<string> = [
  ...DEEP_LOOT,
  "drop-boss-core",
  "gold-pouch",
];

export const MILESTONE_FLOORS: ReadonlyArray<MilestoneFloorReward> = [
  {
    floor: 10,
    titleKey: "dungeon.milestone.10",
    itemId: "item-dungeon-token-bronze",
    quantity: 1,
  },
  {
    floor: 25,
    titleKey: "dungeon.milestone.25",
    itemId: "item-dungeon-token-silver",
    quantity: 1,
  },
  {
    floor: 50,
    titleKey: "dungeon.milestone.50",
    itemId: "item-dungeon-token-gold",
    quantity: 1,
  },
  {
    floor: 100,
    titleKey: "dungeon.milestone.100",
    itemId: "item-dungeon-champion-trophy",
    quantity: 1,
  },
];

export const isBossFloor = (floor: number): boolean => {
  if (floor <= 0) return false;
  return floor % BOSS_FLOOR_INTERVAL === 0;
};

const pickLootPool = (floor: number, boss: boolean): ReadonlyArray<string> => {
  if (boss) return BOSS_LOOT;
  if (floor >= 10) return DEEP_LOOT;
  return BASE_LOOT;
};

export const getDifficultyForFloor = (floor: number): FloorDifficulty => {
  if (floor < 1) {
    throw new Error(`getDifficultyForFloor: floor must be >= 1, got ${floor}`);
  }
  const depth = floor - 1;
  const boss = isBossFloor(floor);
  return {
    floor,
    monsterHpMultiplier: 1 + depth * HP_MULT_PER_FLOOR,
    monsterAttackMultiplier: 1 + depth * ATK_MULT_PER_FLOOR,
    goldMultiplier: 1 + depth * GOLD_MULT_PER_FLOOR,
    isBoss: boss,
    lootPool: pickLootPool(floor, boss),
  };
};

export const getMilestoneReward = (
  floor: number,
): MilestoneFloorReward | null =>
  MILESTONE_FLOORS.find((m) => m.floor === floor) ?? null;
