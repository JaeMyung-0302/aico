// Guardian bonus IDs mirror the four seasons. Kept as a separate type so
// this module has no runtime dependency on guardian.ts (a sibling branch).
export type GuardianBonusId = "spring" | "summer" | "autumn" | "winter";

export interface GuardianBonus {
  readonly hpBonus: number;
  readonly attackBonus: number;
  readonly defenseBonus: number;
  readonly resistSeason: GuardianBonusId;
}

export interface AggregatedBonuses {
  readonly hpBonus: number;
  readonly attackBonus: number;
  readonly defenseBonus: number;
  readonly seasonResists: ReadonlyArray<GuardianBonusId>;
}

export interface CombatStats {
  readonly hp: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
}

export const GUARDIAN_BONUSES: Readonly<
  Record<GuardianBonusId, GuardianBonus>
> = {
  spring: {
    hpBonus: 20,
    attackBonus: 2,
    defenseBonus: 1,
    resistSeason: "spring",
  },
  summer: {
    hpBonus: 35,
    attackBonus: 4,
    defenseBonus: 2,
    resistSeason: "summer",
  },
  autumn: {
    hpBonus: 55,
    attackBonus: 6,
    defenseBonus: 4,
    resistSeason: "autumn",
  },
  winter: {
    hpBonus: 80,
    attackBonus: 8,
    defenseBonus: 6,
    resistSeason: "winter",
  },
};

const isKnownId = (id: GuardianBonusId): boolean => id in GUARDIAN_BONUSES;

export const getBonusForGuardian = (
  id: GuardianBonusId,
): GuardianBonus | null => (isKnownId(id) ? GUARDIAN_BONUSES[id] : null);

export const aggregateGuardianBonuses = (
  summoned: ReadonlyArray<GuardianBonusId>,
): AggregatedBonuses => {
  const uniqueKnown = new Set<GuardianBonusId>();
  for (const id of summoned) {
    if (isKnownId(id)) uniqueKnown.add(id);
  }

  let hpBonus = 0;
  let attackBonus = 0;
  let defenseBonus = 0;
  const resists: GuardianBonusId[] = [];

  for (const id of uniqueKnown) {
    const b = GUARDIAN_BONUSES[id];
    hpBonus += b.hpBonus;
    attackBonus += b.attackBonus;
    defenseBonus += b.defenseBonus;
    resists.push(b.resistSeason);
  }

  return {
    hpBonus,
    attackBonus,
    defenseBonus,
    seasonResists: resists,
  };
};

export const applyBonusesToCombat = (
  stats: CombatStats,
  bonuses: AggregatedBonuses,
): CombatStats => {
  const newMaxHp = stats.maxHp + bonuses.hpBonus;
  const newHp = Math.min(stats.hp + bonuses.hpBonus, newMaxHp);
  return {
    hp: newHp,
    maxHp: newMaxHp,
    attack: stats.attack + bonuses.attackBonus,
    defense: stats.defense + bonuses.defenseBonus,
  };
};
