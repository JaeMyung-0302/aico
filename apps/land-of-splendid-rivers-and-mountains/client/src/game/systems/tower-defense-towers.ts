export type TowerType = "archer" | "cannon" | "spirit" | "healer";

export interface TowerDefinition {
  readonly type: TowerType;
  readonly nameKey: string;
  readonly cost: number;
  readonly damage: number;
  readonly range: number;
  readonly fireIntervalMs: number;
  readonly specialEffect?: string;
}

export interface AffordCheck {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export interface PurchaseResult {
  readonly newGold: number;
  readonly defId: TowerType;
}

export interface WaveRewardInput {
  readonly enemyCount: number;
  readonly isBossWave: boolean;
}

export const TOWER_TYPES: ReadonlyArray<TowerType> = [
  "archer",
  "cannon",
  "spirit",
  "healer",
];

export const TOWERS: Readonly<Record<TowerType, TowerDefinition>> = {
  archer: {
    type: "archer",
    nameKey: "tower.archer",
    cost: 50,
    damage: 8,
    range: 180,
    fireIntervalMs: 700,
  },
  cannon: {
    type: "cannon",
    nameKey: "tower.cannon",
    cost: 120,
    damage: 28,
    range: 220,
    fireIntervalMs: 1500,
    specialEffect: "splash",
  },
  spirit: {
    type: "spirit",
    nameKey: "tower.spirit",
    cost: 200,
    damage: 16,
    range: 260,
    fireIntervalMs: 1000,
    specialEffect: "slow",
  },
  healer: {
    type: "healer",
    nameKey: "tower.healer",
    cost: 150,
    damage: 1,
    range: 140,
    fireIntervalMs: 1200,
    specialEffect: "ally_heal",
  },
};

export const SELL_REFUND_RATIO = 0.5;
export const REWARD_PER_ENEMY = 10;
export const BOSS_WAVE_MULTIPLIER = 3;

const isKnownType = (type: TowerType): boolean => TOWER_TYPES.includes(type);

export const getTowerDef = (type: TowerType): TowerDefinition | null =>
  isKnownType(type) ? TOWERS[type] : null;

export const canAffordTower = (gold: number, type: TowerType): AffordCheck => {
  const reasons: string[] = [];
  const def = getTowerDef(type);
  if (!def) {
    reasons.push("unknownTower");
  } else if (gold < def.cost) {
    reasons.push("insufficientGold");
  }
  return { ok: reasons.length === 0, reasons };
};

export const purchaseTower = (
  gold: number,
  type: TowerType,
): PurchaseResult => {
  const check = canAffordTower(gold, type);
  if (!check.ok) {
    throw new Error(`purchaseTower: rejected (${check.reasons.join(", ")})`);
  }
  const def = TOWERS[type];
  return { newGold: gold - def.cost, defId: type };
};

export const calcTowerRefund = (type: TowerType): number => {
  const def = getTowerDef(type);
  return def ? Math.floor(def.cost * SELL_REFUND_RATIO) : 0;
};

export const calcWaveReward = (input: WaveRewardInput): number => {
  const count = Math.max(0, input.enemyCount);
  const base = count * REWARD_PER_ENEMY;
  return input.isBossWave ? base * BOSS_WAVE_MULTIPLIER : base;
};
