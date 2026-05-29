import { describe, it, expect } from "vitest";
import {
  MAX_RELATION,
  MIN_RELATION,
  REL_LEVELS,
  getCurrentLevel,
  getRewardsBetween,
  type RelationLevel,
} from "../game/systems/relationship-levels";

describe("relationship-levels — constants and table", () => {
  it("MAX_RELATION is 10, MIN_RELATION is 0", () => {
    expect(MAX_RELATION).toBe(10);
    expect(MIN_RELATION).toBe(0);
  });

  it("REL_LEVELS has 11 entries covering 0..10 in ascending order", () => {
    expect(REL_LEVELS.length).toBe(11);
    for (let i = 0; i < REL_LEVELS.length; i++) {
      expect(REL_LEVELS[i]!.level).toBe(i);
    }
  });

  it("each level has a non-empty titleKey", () => {
    for (const l of REL_LEVELS) {
      expect(l.titleKey.length).toBeGreaterThan(0);
    }
  });

  it("at least one level above 5 carries a reward (matches 10-level content goal)", () => {
    const highRewards = REL_LEVELS.filter(
      (l) => l.level > 5 && l.reward !== undefined,
    );
    expect(highRewards.length).toBeGreaterThan(0);
  });
});

describe("getCurrentLevel", () => {
  it("returns level 0 for relation 0", () => {
    expect(getCurrentLevel(0).level).toBe(0);
  });

  it("returns MAX_RELATION for relation 10", () => {
    expect(getCurrentLevel(10).level).toBe(10);
  });

  it("clamps below 0 to level 0", () => {
    expect(getCurrentLevel(-5).level).toBe(0);
  });

  it("clamps above 10 to MAX_RELATION", () => {
    expect(getCurrentLevel(999).level).toBe(MAX_RELATION);
  });

  it("floors fractional relations (partial progress does not promote)", () => {
    expect(getCurrentLevel(3.9).level).toBe(3);
    expect(getCurrentLevel(7.01).level).toBe(7);
  });

  it("returns the canonical entry for each whole-number level", () => {
    for (let i = MIN_RELATION; i <= MAX_RELATION; i++) {
      const got = getCurrentLevel(i);
      expect(got).toEqual(REL_LEVELS[i]!);
    }
  });
});

describe("getRewardsBetween", () => {
  it("returns an empty list when relation is unchanged", () => {
    expect(getRewardsBetween(5, 5)).toEqual([]);
  });

  it("returns an empty list when relation decreases", () => {
    expect(getRewardsBetween(8, 3)).toEqual([]);
  });

  it("returns rewards for every newly-crossed level that carries one", () => {
    const rewards = getRewardsBetween(0, MAX_RELATION);
    const expected = REL_LEVELS.filter(
      (l) => l.level > 0 && l.reward !== undefined,
    ).map((l) => l.reward!);
    expect(rewards).toEqual(expected);
  });

  it("excludes the starting level's reward (only levels strictly above prev)", () => {
    const rewards = getRewardsBetween(5, 6);
    // If level 6 carries a reward, it should appear; level 5's must not.
    const level6 = REL_LEVELS[6]!;
    if (level6.reward !== undefined) {
      expect(rewards).toContainEqual(level6.reward);
    }
    const level5 = REL_LEVELS[5]!;
    if (level5.reward !== undefined) {
      expect(rewards).not.toContainEqual(level5.reward);
    }
  });

  it("skips levels without rewards", () => {
    // Count rewards for levels strictly greater than the starting level 0.
    const rewardsInRange = REL_LEVELS.filter(
      (l) => l.level > 0 && l.reward !== undefined,
    ).length;
    const rewards = getRewardsBetween(0, MAX_RELATION);
    expect(rewards.length).toBe(rewardsInRange);
  });

  it("clamps when new > MAX_RELATION", () => {
    const a = getRewardsBetween(0, MAX_RELATION);
    const b = getRewardsBetween(0, MAX_RELATION + 5);
    expect(b).toEqual(a);
  });

  it("clamps when prev < MIN_RELATION", () => {
    const a = getRewardsBetween(0, 5);
    const b = getRewardsBetween(-100, 5);
    expect(b).toEqual(a);
  });
});

describe("purity", () => {
  it("REL_LEVELS cannot be mutated via operations", () => {
    const snapshot = JSON.stringify(REL_LEVELS);
    getCurrentLevel(5);
    getRewardsBetween(0, 10);
    expect(JSON.stringify(REL_LEVELS)).toBe(snapshot);
  });

  it("getRewardsBetween returns a fresh array", () => {
    const a = getRewardsBetween(0, 10);
    const b = getRewardsBetween(0, 10);
    expect(a).not.toBe(b);
  });
});

describe("type sanity", () => {
  it("matches expected RelationLevel shape", () => {
    const l: RelationLevel = REL_LEVELS[10]!;
    expect(typeof l.level).toBe("number");
    expect(typeof l.titleKey).toBe("string");
  });
});
