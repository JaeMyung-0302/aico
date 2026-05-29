export type GuardianId = "spring" | "summer" | "autumn" | "winter";
export type Element = "wood" | "fire" | "metal" | "water";

export interface GuardianRequirement {
  readonly minYear?: number;
  readonly minReputation?: number;
  readonly requiredItemId?: string;
  readonly requiredBossDefeat?: string;
}

export interface GuardianDefinition {
  readonly id: GuardianId;
  readonly nameKey: string;
  readonly element: Element;
  readonly hpBonus: number;
  readonly requirements: GuardianRequirement;
}

export interface GuardianSummonState {
  readonly year: number;
  readonly reputation: number;
  readonly inventory: ReadonlyArray<string>;
  readonly defeatedBosses: ReadonlyArray<string>;
}

export interface CanSummonResult {
  readonly canSummon: boolean;
  readonly missing: ReadonlyArray<string>;
}

export const GUARDIAN_IDS: ReadonlyArray<GuardianId> = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

export const GUARDIANS: Readonly<Record<GuardianId, GuardianDefinition>> = {
  spring: {
    id: "spring",
    nameKey: "guardian.spring.name",
    element: "wood",
    hpBonus: 30,
    requirements: {
      minYear: 1,
      requiredItemId: "talisman-spring",
    },
  },
  summer: {
    id: "summer",
    nameKey: "guardian.summer.name",
    element: "fire",
    hpBonus: 50,
    requirements: {
      minYear: 1,
      minReputation: 50,
      requiredItemId: "talisman-summer",
    },
  },
  autumn: {
    id: "autumn",
    nameKey: "guardian.autumn.name",
    element: "metal",
    hpBonus: 70,
    requirements: {
      minYear: 2,
      minReputation: 100,
      requiredItemId: "talisman-autumn",
    },
  },
  winter: {
    id: "winter",
    nameKey: "guardian.winter.name",
    element: "water",
    hpBonus: 100,
    requirements: {
      minYear: 2,
      minReputation: 150,
      requiredItemId: "talisman-winter",
      requiredBossDefeat: "phantom-king",
    },
  },
};

export const allGuardians = (): GuardianDefinition[] =>
  GUARDIAN_IDS.map((id) => GUARDIANS[id]!);

export const canSummonGuardian = (
  def: GuardianDefinition,
  state: GuardianSummonState,
): CanSummonResult => {
  const missing: string[] = [];
  const r = def.requirements;

  if (r.minYear !== undefined && state.year < r.minYear) {
    missing.push("minYear");
  }
  if (r.minReputation !== undefined && state.reputation < r.minReputation) {
    missing.push("minReputation");
  }
  if (
    r.requiredItemId !== undefined &&
    !state.inventory.includes(r.requiredItemId)
  ) {
    missing.push("requiredItemId");
  }
  if (
    r.requiredBossDefeat !== undefined &&
    !state.defeatedBosses.includes(r.requiredBossDefeat)
  ) {
    missing.push("requiredBossDefeat");
  }

  return { canSummon: missing.length === 0, missing };
};
