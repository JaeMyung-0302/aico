import { describe, it, expect } from "vitest";
import {
  DEX_CATEGORIES,
  DEX_MILESTONES,
  getCategoryCompletion,
  getOverallCompletion,
  getUnlockedMilestones,
  getNewlyUnlockedRewards,
  type DexProgress,
} from "../game/systems/dex-rewards";

const zeroProgress = (): DexProgress => ({
  discoveredByCategory: Object.fromEntries(
    DEX_CATEGORIES.map((c) => [c.id, 0]),
  ),
});

const fullProgress = (): DexProgress => ({
  discoveredByCategory: Object.fromEntries(
    DEX_CATEGORIES.map((c) => [c.id, c.totalEntries]),
  ),
});

describe("dex-rewards — tables", () => {
  it("DEX_CATEGORIES defines at least 4 categories with positive totals", () => {
    expect(DEX_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    for (const c of DEX_CATEGORIES) {
      expect(c.totalEntries).toBeGreaterThan(0);
      expect(c.id.length).toBeGreaterThan(0);
    }
  });

  it("DEX_CATEGORIES ids are unique", () => {
    const ids = DEX_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEX_MILESTONES are in ascending percent order", () => {
    for (let i = 1; i < DEX_MILESTONES.length; i++) {
      expect(DEX_MILESTONES[i]!.percent).toBeGreaterThan(
        DEX_MILESTONES[i - 1]!.percent,
      );
    }
  });

  it("DEX_MILESTONES percents are within [1, 100]", () => {
    for (const m of DEX_MILESTONES) {
      expect(m.percent).toBeGreaterThan(0);
      expect(m.percent).toBeLessThanOrEqual(100);
    }
  });

  it("DEX_MILESTONES includes a 100% capstone", () => {
    expect(DEX_MILESTONES.some((m) => m.percent === 100)).toBe(true);
  });
});

describe("getCategoryCompletion", () => {
  const category = DEX_CATEGORIES[0]!;

  it("returns 0 when nothing discovered", () => {
    expect(getCategoryCompletion(category, zeroProgress())).toBe(0);
  });

  it("returns 100 when fully discovered", () => {
    expect(getCategoryCompletion(category, fullProgress())).toBe(100);
  });

  it("caps at 100 even if discovered count exceeds total (robustness)", () => {
    const progress: DexProgress = {
      discoveredByCategory: {
        ...zeroProgress().discoveredByCategory,
        [category.id]: category.totalEntries + 50,
      },
    };
    expect(getCategoryCompletion(category, progress)).toBe(100);
  });

  it("returns 50 at half progress", () => {
    const progress: DexProgress = {
      discoveredByCategory: {
        ...zeroProgress().discoveredByCategory,
        [category.id]: Math.floor(category.totalEntries / 2),
      },
    };
    const expected =
      (Math.floor(category.totalEntries / 2) / category.totalEntries) * 100;
    expect(getCategoryCompletion(category, progress)).toBeCloseTo(expected, 5);
  });

  it("treats missing category entries as zero discovered", () => {
    const progress: DexProgress = { discoveredByCategory: {} };
    expect(getCategoryCompletion(category, progress)).toBe(0);
  });
});

describe("getOverallCompletion", () => {
  it("is 0 when nothing discovered", () => {
    expect(getOverallCompletion(DEX_CATEGORIES, zeroProgress())).toBe(0);
  });

  it("is 100 when all categories are complete", () => {
    expect(getOverallCompletion(DEX_CATEGORIES, fullProgress())).toBe(100);
  });

  it("averages category completions", () => {
    const progress: DexProgress = {
      discoveredByCategory: Object.fromEntries(
        DEX_CATEGORIES.map((c, i) => [c.id, i === 0 ? c.totalEntries : 0]),
      ),
    };
    const expected = 100 / DEX_CATEGORIES.length;
    expect(getOverallCompletion(DEX_CATEGORIES, progress)).toBeCloseTo(
      expected,
      5,
    );
  });
});

describe("getUnlockedMilestones", () => {
  it("returns empty array at 0%", () => {
    expect(getUnlockedMilestones(0)).toEqual([]);
  });

  it("returns milestones with percent <= overall", () => {
    const atFifty = getUnlockedMilestones(50);
    for (const m of atFifty) expect(m.percent).toBeLessThanOrEqual(50);
  });

  it("returns all milestones at 100%", () => {
    expect(getUnlockedMilestones(100).length).toBe(DEX_MILESTONES.length);
  });

  it("clamps negative overall to 0 milestones", () => {
    expect(getUnlockedMilestones(-50)).toEqual([]);
  });

  it("clamps overall > 100 to all milestones", () => {
    expect(getUnlockedMilestones(200).length).toBe(DEX_MILESTONES.length);
  });
});

describe("getNewlyUnlockedRewards", () => {
  it("returns empty array when percent is unchanged", () => {
    expect(getNewlyUnlockedRewards(50, 50)).toEqual([]);
  });

  it("returns empty array when percent decreases (no regression grants)", () => {
    expect(getNewlyUnlockedRewards(80, 40)).toEqual([]);
  });

  it("returns newly-crossed milestones only", () => {
    const firstMilestone = DEX_MILESTONES[0]!;
    const secondMilestone = DEX_MILESTONES[1]!;
    const crossed = getNewlyUnlockedRewards(
      firstMilestone.percent,
      secondMilestone.percent,
    );
    expect(crossed).toEqual([secondMilestone]);
  });

  it("returns multiple milestones when crossing more than one", () => {
    const all100 = getNewlyUnlockedRewards(0, 100);
    expect(all100).toEqual(DEX_MILESTONES);
  });
});

describe("purity", () => {
  it("does not mutate the categories array", () => {
    const snapshot = JSON.stringify(DEX_CATEGORIES);
    getCategoryCompletion(DEX_CATEGORIES[0]!, zeroProgress());
    getOverallCompletion(DEX_CATEGORIES, fullProgress());
    expect(JSON.stringify(DEX_CATEGORIES)).toBe(snapshot);
  });

  it("does not mutate the progress argument", () => {
    const p = zeroProgress();
    const snapshot = structuredClone(p);
    getCategoryCompletion(DEX_CATEGORIES[0]!, p);
    getOverallCompletion(DEX_CATEGORIES, p);
    expect(p).toEqual(snapshot);
  });
});
