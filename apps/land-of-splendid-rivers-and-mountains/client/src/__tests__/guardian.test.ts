import { describe, it, expect } from "vitest";
import {
  GUARDIANS,
  GUARDIAN_IDS,
  allGuardians,
  canSummonGuardian,
  type GuardianSummonState,
  type GuardianDefinition,
} from "../game/systems/guardian";

const emptyState = (
  overrides: Partial<GuardianSummonState> = {},
): GuardianSummonState => ({
  year: 1,
  reputation: 0,
  inventory: [],
  defeatedBosses: [],
  ...overrides,
});

describe("GUARDIANS table", () => {
  it("defines exactly 4 guardians, one per season", () => {
    expect(GUARDIAN_IDS).toEqual(["spring", "summer", "autumn", "winter"]);
    for (const id of GUARDIAN_IDS) {
      expect(GUARDIANS[id]).toBeDefined();
      expect(GUARDIANS[id]!.id).toBe(id);
    }
  });

  it("each guardian has a distinct element", () => {
    const elements = GUARDIAN_IDS.map((id) => GUARDIANS[id]!.element);
    expect(new Set(elements).size).toBe(elements.length);
  });

  it("each guardian has a positive hpBonus", () => {
    for (const id of GUARDIAN_IDS) {
      expect(GUARDIANS[id]!.hpBonus).toBeGreaterThan(0);
    }
  });

  it("each guardian has a non-empty nameKey", () => {
    for (const id of GUARDIAN_IDS) {
      expect(GUARDIANS[id]!.nameKey.length).toBeGreaterThan(0);
    }
  });
});

describe("allGuardians", () => {
  it("returns the 4 guardians in season order", () => {
    const list = allGuardians();
    expect(list.length).toBe(4);
    expect(list.map((g) => g.id)).toEqual([
      "spring",
      "summer",
      "autumn",
      "winter",
    ]);
  });

  it("returns a fresh array each call (no shared mutation surface)", () => {
    expect(allGuardians()).not.toBe(allGuardians());
  });
});

describe("canSummonGuardian — requirement satisfaction", () => {
  it("returns canSummon=true when all requirements met", () => {
    const def: GuardianDefinition = {
      id: "spring",
      nameKey: "guardian.spring.name",
      element: "wood",
      hpBonus: 50,
      requirements: {
        minYear: 2,
        minReputation: 100,
        requiredItemId: "talisman-spring",
        requiredBossDefeat: "phantom-king",
      },
    };
    const state = emptyState({
      year: 2,
      reputation: 100,
      inventory: ["talisman-spring", "wood"],
      defeatedBosses: ["phantom-king"],
    });
    const result = canSummonGuardian(def, state);
    expect(result.canSummon).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns canSummon=true with empty requirements", () => {
    const def: GuardianDefinition = {
      id: "spring",
      nameKey: "guardian.spring.name",
      element: "wood",
      hpBonus: 50,
      requirements: {},
    };
    const result = canSummonGuardian(def, emptyState());
    expect(result.canSummon).toBe(true);
  });
});

describe("canSummonGuardian — missing requirements", () => {
  const fullDef: GuardianDefinition = {
    id: "spring",
    nameKey: "guardian.spring.name",
    element: "wood",
    hpBonus: 50,
    requirements: {
      minYear: 2,
      minReputation: 100,
      requiredItemId: "talisman-spring",
      requiredBossDefeat: "phantom-king",
    },
  };

  it("flags minYear when current year is too low", () => {
    const result = canSummonGuardian(
      fullDef,
      emptyState({
        year: 1,
        reputation: 100,
        inventory: ["talisman-spring"],
        defeatedBosses: ["phantom-king"],
      }),
    );
    expect(result.canSummon).toBe(false);
    expect(result.missing).toContain("minYear");
  });

  it("flags minReputation when below threshold", () => {
    const result = canSummonGuardian(
      fullDef,
      emptyState({
        year: 2,
        reputation: 50,
        inventory: ["talisman-spring"],
        defeatedBosses: ["phantom-king"],
      }),
    );
    expect(result.canSummon).toBe(false);
    expect(result.missing).toContain("minReputation");
  });

  it("flags requiredItemId when item not owned", () => {
    const result = canSummonGuardian(
      fullDef,
      emptyState({
        year: 2,
        reputation: 100,
        inventory: ["wood"],
        defeatedBosses: ["phantom-king"],
      }),
    );
    expect(result.canSummon).toBe(false);
    expect(result.missing).toContain("requiredItemId");
  });

  it("flags requiredBossDefeat when boss not defeated", () => {
    const result = canSummonGuardian(
      fullDef,
      emptyState({
        year: 2,
        reputation: 100,
        inventory: ["talisman-spring"],
        defeatedBosses: [],
      }),
    );
    expect(result.canSummon).toBe(false);
    expect(result.missing).toContain("requiredBossDefeat");
  });

  it("lists all missing requirements at once when many fail", () => {
    const result = canSummonGuardian(fullDef, emptyState());
    expect(result.canSummon).toBe(false);
    expect(result.missing).toContain("minYear");
    expect(result.missing).toContain("minReputation");
    expect(result.missing).toContain("requiredItemId");
    expect(result.missing).toContain("requiredBossDefeat");
  });

  it("does not include requirements that were not configured", () => {
    const def: GuardianDefinition = {
      id: "spring",
      nameKey: "guardian.spring.name",
      element: "wood",
      hpBonus: 50,
      requirements: { minYear: 5 },
    };
    const result = canSummonGuardian(def, emptyState({ year: 1 }));
    expect(result.missing).toEqual(["minYear"]);
  });
});

describe("canSummonGuardian — boundary cases", () => {
  it("minYear is satisfied at exact equality", () => {
    const def: GuardianDefinition = {
      id: "spring",
      nameKey: "guardian.spring.name",
      element: "wood",
      hpBonus: 50,
      requirements: { minYear: 3 },
    };
    expect(canSummonGuardian(def, emptyState({ year: 3 })).canSummon).toBe(
      true,
    );
  });

  it("minReputation is satisfied at exact equality", () => {
    const def: GuardianDefinition = {
      id: "spring",
      nameKey: "guardian.spring.name",
      element: "wood",
      hpBonus: 50,
      requirements: { minReputation: 100 },
    };
    expect(
      canSummonGuardian(def, emptyState({ reputation: 100 })).canSummon,
    ).toBe(true);
  });
});

describe("canSummonGuardian — purity", () => {
  it("does not mutate the input state", () => {
    const state = emptyState({
      year: 2,
      reputation: 50,
      inventory: ["talisman-spring"],
      defeatedBosses: ["phantom-king"],
    });
    const snapshot = structuredClone(state);
    canSummonGuardian(GUARDIANS.spring!, state);
    expect(state).toEqual(snapshot);
  });

  it("does not mutate the definition", () => {
    const def = GUARDIANS.summer!;
    const snapshot = structuredClone(def);
    canSummonGuardian(def, emptyState());
    expect(def).toEqual(snapshot);
  });
});
