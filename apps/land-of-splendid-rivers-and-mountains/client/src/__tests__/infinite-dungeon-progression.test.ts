import { describe, it, expect } from "vitest";
import {
  HP_MULT_PER_FLOOR,
  ATK_MULT_PER_FLOOR,
  GOLD_MULT_PER_FLOOR,
  BOSS_FLOOR_INTERVAL,
  MILESTONE_FLOORS,
  getDifficultyForFloor,
  isBossFloor,
  getMilestoneReward,
} from "../game/systems/infinite-dungeon-progression";

describe("progression constants", () => {
  it("HP/ATK/GOLD multipliers are positive", () => {
    expect(HP_MULT_PER_FLOOR).toBeGreaterThan(0);
    expect(ATK_MULT_PER_FLOOR).toBeGreaterThan(0);
    expect(GOLD_MULT_PER_FLOOR).toBeGreaterThan(0);
  });

  it("BOSS_FLOOR_INTERVAL is 5", () => {
    expect(BOSS_FLOOR_INTERVAL).toBe(5);
  });

  it("MILESTONE_FLOORS is ascending and non-empty", () => {
    expect(MILESTONE_FLOORS.length).toBeGreaterThan(0);
    for (let i = 1; i < MILESTONE_FLOORS.length; i++) {
      expect(MILESTONE_FLOORS[i]!.floor).toBeGreaterThan(
        MILESTONE_FLOORS[i - 1]!.floor,
      );
    }
  });
});

describe("getDifficultyForFloor — baseline and scaling", () => {
  it("floor 1 has unit multipliers (baseline)", () => {
    const d = getDifficultyForFloor(1);
    expect(d.floor).toBe(1);
    expect(d.monsterHpMultiplier).toBe(1);
    expect(d.monsterAttackMultiplier).toBe(1);
    expect(d.goldMultiplier).toBe(1);
    expect(d.isBoss).toBe(false);
  });

  it("scaling is monotonically non-decreasing with floor", () => {
    const d1 = getDifficultyForFloor(1);
    const d5 = getDifficultyForFloor(5);
    const d20 = getDifficultyForFloor(20);
    expect(d5.monsterHpMultiplier).toBeGreaterThan(d1.monsterHpMultiplier);
    expect(d20.monsterHpMultiplier).toBeGreaterThan(d5.monsterHpMultiplier);
    expect(d20.monsterAttackMultiplier).toBeGreaterThan(
      d5.monsterAttackMultiplier,
    );
    expect(d20.goldMultiplier).toBeGreaterThan(d5.goldMultiplier);
  });

  it("every 5th floor is a boss", () => {
    expect(getDifficultyForFloor(5).isBoss).toBe(true);
    expect(getDifficultyForFloor(10).isBoss).toBe(true);
    expect(getDifficultyForFloor(15).isBoss).toBe(true);
  });

  it("non-boss floors are correctly flagged", () => {
    expect(getDifficultyForFloor(4).isBoss).toBe(false);
    expect(getDifficultyForFloor(6).isBoss).toBe(false);
    expect(getDifficultyForFloor(11).isBoss).toBe(false);
  });

  it("throws for floor < 1", () => {
    expect(() => getDifficultyForFloor(0)).toThrow();
    expect(() => getDifficultyForFloor(-10)).toThrow();
  });

  it("boss floors grant a loot bonus over non-boss floors at similar depth", () => {
    const d4 = getDifficultyForFloor(4);
    const d5 = getDifficultyForFloor(5);
    expect(d5.lootPool.length).toBeGreaterThanOrEqual(d4.lootPool.length);
  });
});

describe("isBossFloor", () => {
  it("returns true for multiples of BOSS_FLOOR_INTERVAL", () => {
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(100)).toBe(true);
  });

  it("returns false for non-multiples", () => {
    expect(isBossFloor(1)).toBe(false);
    expect(isBossFloor(7)).toBe(false);
  });

  it("returns false for floor 0 (invalid floor)", () => {
    expect(isBossFloor(0)).toBe(false);
  });
});

describe("getMilestoneReward", () => {
  it("returns the matching milestone for an exact floor", () => {
    const first = MILESTONE_FLOORS[0]!;
    expect(getMilestoneReward(first.floor)).toEqual(first);
  });

  it("returns null for a non-milestone floor", () => {
    expect(getMilestoneReward(1)).toBeNull();
    expect(getMilestoneReward(2)).toBeNull();
  });

  it("returns null below or above the milestone range", () => {
    expect(getMilestoneReward(0)).toBeNull();
    expect(getMilestoneReward(999)).toBeNull();
  });
});

describe("purity", () => {
  it("MILESTONE_FLOORS is not mutated by operations", () => {
    const snapshot = JSON.stringify(MILESTONE_FLOORS);
    getDifficultyForFloor(10);
    getMilestoneReward(25);
    expect(JSON.stringify(MILESTONE_FLOORS)).toBe(snapshot);
  });

  it("getDifficultyForFloor returns a fresh object each call", () => {
    expect(getDifficultyForFloor(3)).not.toBe(getDifficultyForFloor(3));
  });
});
