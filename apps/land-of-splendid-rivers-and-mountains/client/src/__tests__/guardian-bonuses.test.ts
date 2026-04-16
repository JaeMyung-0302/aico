import { describe, it, expect } from "vitest";
import {
  GUARDIAN_BONUSES,
  getBonusForGuardian,
  aggregateGuardianBonuses,
  applyBonusesToCombat,
  type GuardianBonusId,
  type CombatStats,
} from "../game/systems/guardian-bonuses";

const allIds: ReadonlyArray<GuardianBonusId> = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

const baseStats: CombatStats = {
  hp: 100,
  maxHp: 100,
  attack: 10,
  defense: 5,
};

describe("GUARDIAN_BONUSES table", () => {
  it("defines a bonus for every guardian id", () => {
    for (const id of allIds) {
      expect(GUARDIAN_BONUSES[id]).toBeDefined();
    }
  });

  it("each bonus has non-negative values", () => {
    for (const id of allIds) {
      const b = GUARDIAN_BONUSES[id];
      expect(b.hpBonus).toBeGreaterThanOrEqual(0);
      expect(b.attackBonus).toBeGreaterThanOrEqual(0);
      expect(b.defenseBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it("each bonus ties to its own season for weather resistance", () => {
    for (const id of allIds) {
      expect(GUARDIAN_BONUSES[id].resistSeason).toBe(id);
    }
  });

  it("bonus magnitudes escalate spring < summer < autumn < winter", () => {
    const order: ReadonlyArray<GuardianBonusId> = [
      "spring",
      "summer",
      "autumn",
      "winter",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(GUARDIAN_BONUSES[order[i]!].hpBonus).toBeGreaterThanOrEqual(
        GUARDIAN_BONUSES[order[i - 1]!].hpBonus,
      );
    }
  });
});

describe("getBonusForGuardian", () => {
  it("returns the matching bonus for a known id", () => {
    expect(getBonusForGuardian("spring")).toBe(GUARDIAN_BONUSES.spring);
  });

  it("returns null for unknown ids", () => {
    expect(getBonusForGuardian("unknown" as GuardianBonusId)).toBeNull();
  });
});

describe("aggregateGuardianBonuses", () => {
  it("sums hp/attack/defense across summoned ids", () => {
    const agg = aggregateGuardianBonuses(["spring", "autumn"]);
    expect(agg.hpBonus).toBe(
      GUARDIAN_BONUSES.spring.hpBonus + GUARDIAN_BONUSES.autumn.hpBonus,
    );
    expect(agg.attackBonus).toBe(
      GUARDIAN_BONUSES.spring.attackBonus + GUARDIAN_BONUSES.autumn.attackBonus,
    );
    expect(agg.defenseBonus).toBe(
      GUARDIAN_BONUSES.spring.defenseBonus +
        GUARDIAN_BONUSES.autumn.defenseBonus,
    );
  });

  it("collects seasonResists as the set of summoned seasons", () => {
    const agg = aggregateGuardianBonuses(["summer", "winter"]);
    expect(agg.seasonResists).toEqual(
      expect.arrayContaining(["summer", "winter"]),
    );
    expect(agg.seasonResists.length).toBe(2);
  });

  it("deduplicates when the same id is summoned twice", () => {
    const agg = aggregateGuardianBonuses(["spring", "spring"]);
    expect(agg.hpBonus).toBe(GUARDIAN_BONUSES.spring.hpBonus);
    expect(agg.seasonResists).toEqual(["spring"]);
  });

  it("ignores unknown ids silently (logs/rejects at caller boundary)", () => {
    const agg = aggregateGuardianBonuses([
      "spring",
      "unknown" as GuardianBonusId,
    ]);
    expect(agg.hpBonus).toBe(GUARDIAN_BONUSES.spring.hpBonus);
    expect(agg.seasonResists).toEqual(["spring"]);
  });

  it("returns zero aggregate for an empty array", () => {
    const agg = aggregateGuardianBonuses([]);
    expect(agg).toEqual({
      hpBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      seasonResists: [],
    });
  });
});

describe("applyBonusesToCombat", () => {
  it("adds bonuses on top of base stats", () => {
    const agg = aggregateGuardianBonuses(allIds);
    const final = applyBonusesToCombat(baseStats, agg);
    expect(final.hp).toBe(baseStats.hp + agg.hpBonus);
    expect(final.maxHp).toBe(baseStats.maxHp + agg.hpBonus);
    expect(final.attack).toBe(baseStats.attack + agg.attackBonus);
    expect(final.defense).toBe(baseStats.defense + agg.defenseBonus);
  });

  it("does not exceed maxHp + hpBonus (hp clamped to new max)", () => {
    const agg = aggregateGuardianBonuses(["winter"]);
    const hurt: CombatStats = { ...baseStats, hp: 90 };
    const final = applyBonusesToCombat(hurt, agg);
    expect(final.hp).toBeLessThanOrEqual(final.maxHp);
  });

  it("noop when bonuses are all zero", () => {
    const empty = aggregateGuardianBonuses([]);
    const final = applyBonusesToCombat(baseStats, empty);
    expect(final).toEqual(baseStats);
  });
});

describe("purity", () => {
  it("aggregate does not mutate the input array", () => {
    const summoned = ["spring", "autumn"] as GuardianBonusId[];
    const snapshot = [...summoned];
    aggregateGuardianBonuses(summoned);
    expect(summoned).toEqual(snapshot);
  });

  it("applyBonusesToCombat does not mutate the base stats", () => {
    const stats = { ...baseStats };
    const snapshot = { ...stats };
    applyBonusesToCombat(stats, aggregateGuardianBonuses(["winter"]));
    expect(stats).toEqual(snapshot);
  });
});
