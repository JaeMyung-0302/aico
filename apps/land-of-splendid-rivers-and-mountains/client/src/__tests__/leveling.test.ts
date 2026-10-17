import { describe, it, expect } from "vitest";
import {
  applyExp,
  expRequiredFor,
  EXP_BASE,
  LEVEL_UP_BONUS,
} from "@/game/systems/leveling";

describe("expRequiredFor", () => {
  it("requires level × EXP_BASE", () => {
    expect(expRequiredFor(1)).toBe(EXP_BASE);
    expect(expRequiredFor(3)).toBe(3 * EXP_BASE);
  });
});

describe("applyExp", () => {
  it("accumulates exp without leveling below threshold", () => {
    const r = applyExp(1, 0, EXP_BASE - 1);
    expect(r).toEqual({ level: 1, exp: EXP_BASE - 1, levelsGained: 0 });
  });

  it("levels up exactly at threshold and resets carry", () => {
    const r = applyExp(1, 0, EXP_BASE);
    expect(r).toEqual({ level: 2, exp: 0, levelsGained: 1 });
  });

  it("carries surplus exp into the next level", () => {
    const r = applyExp(1, 10, EXP_BASE);
    expect(r.level).toBe(2);
    expect(r.exp).toBe(10);
  });

  it("handles multi-level gains in one award", () => {
    // lvl1→2: 30, lvl2→3: 60 → 90이면 정확히 레벨 3
    const r = applyExp(1, 0, EXP_BASE * 3);
    expect(r).toEqual({ level: 3, exp: 0, levelsGained: 2 });
  });

  it("던전 1~2층 누적 처치 시 3층 전 레벨 3 도달 (밸런스 가드)", () => {
    // 1층 cheuksin×3(exp10) + 2층 dokkaebi×2(15) + gwishin×2(20) = 100
    const r = applyExp(1, 0, 10 * 3 + 15 * 2 + 20 * 2);
    expect(r.level).toBeGreaterThanOrEqual(3);
  });

  it("ignores negative gains", () => {
    expect(applyExp(2, 5, -10)).toEqual({ level: 2, exp: 5, levelsGained: 0 });
  });

  it("exposes positive stat bonuses per level", () => {
    expect(LEVEL_UP_BONUS.maxHp).toBeGreaterThan(0);
    expect(LEVEL_UP_BONUS.attack).toBeGreaterThan(0);
    expect(LEVEL_UP_BONUS.defense).toBeGreaterThan(0);
  });
});
