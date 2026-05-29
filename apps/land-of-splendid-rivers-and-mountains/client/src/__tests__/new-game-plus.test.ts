import { describe, it, expect } from "vitest";
import {
  STARTING_CYCLE,
  MAX_CYCLE,
  PERMANENT_BONUSES_BY_CYCLE,
  createInitialNgPlusState,
  isEligibleForNewGamePlus,
  advanceCycle,
  type NewGamePlusState,
} from "../game/systems/new-game-plus";

describe("new-game-plus — constants", () => {
  it("STARTING_CYCLE is 0", () => {
    expect(STARTING_CYCLE).toBe(0);
  });

  it("MAX_CYCLE is at least 3", () => {
    expect(MAX_CYCLE).toBeGreaterThanOrEqual(3);
  });

  it("PERMANENT_BONUSES_BY_CYCLE has entries for cycles 1..MAX_CYCLE", () => {
    for (let c = 1; c <= MAX_CYCLE; c++) {
      expect(PERMANENT_BONUSES_BY_CYCLE[c]).toBeDefined();
      expect(PERMANENT_BONUSES_BY_CYCLE[c]!.length).toBeGreaterThan(0);
    }
  });

  it("bonuses accumulate monotonically across cycles", () => {
    for (let c = 2; c <= MAX_CYCLE; c++) {
      const prev = PERMANENT_BONUSES_BY_CYCLE[c - 1]!;
      const curr = PERMANENT_BONUSES_BY_CYCLE[c]!;
      for (const b of prev) {
        expect(curr).toContain(b);
      }
    }
  });
});

describe("createInitialNgPlusState", () => {
  it("starts at cycle 0 with no unlocked bonuses", () => {
    const s = createInitialNgPlusState();
    expect(s.cycleCount).toBe(0);
    expect(s.unlockedBonuses).toEqual([]);
  });

  it("returns a fresh object each call", () => {
    expect(createInitialNgPlusState()).not.toBe(createInitialNgPlusState());
  });
});

describe("isEligibleForNewGamePlus", () => {
  it("ok=true when main quest done and below MAX_CYCLE", () => {
    const r = isEligibleForNewGamePlus(true, createInitialNgPlusState());
    expect(r.canStart).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags mainQuestIncomplete when not done", () => {
    const r = isEligibleForNewGamePlus(false, createInitialNgPlusState());
    expect(r.canStart).toBe(false);
    expect(r.reasons).toContain("mainQuestIncomplete");
  });

  it("flags maxCycleReached at MAX_CYCLE", () => {
    const state: NewGamePlusState = {
      cycleCount: MAX_CYCLE,
      unlockedBonuses: PERMANENT_BONUSES_BY_CYCLE[MAX_CYCLE]!,
    };
    const r = isEligibleForNewGamePlus(true, state);
    expect(r.canStart).toBe(false);
    expect(r.reasons).toContain("maxCycleReached");
  });

  it("aggregates both reasons when both apply", () => {
    const state: NewGamePlusState = {
      cycleCount: MAX_CYCLE,
      unlockedBonuses: PERMANENT_BONUSES_BY_CYCLE[MAX_CYCLE]!,
    };
    const r = isEligibleForNewGamePlus(false, state);
    expect(r.canStart).toBe(false);
    expect(r.reasons).toContain("mainQuestIncomplete");
    expect(r.reasons).toContain("maxCycleReached");
  });
});

describe("advanceCycle", () => {
  it("increments cycleCount from 0 to 1 and applies cycle-1 bonuses", () => {
    const next = advanceCycle(createInitialNgPlusState());
    expect(next.cycleCount).toBe(1);
    expect(next.unlockedBonuses).toEqual(PERMANENT_BONUSES_BY_CYCLE[1]!);
  });

  it("accumulates bonuses through cycles", () => {
    let s = createInitialNgPlusState();
    s = advanceCycle(s); // cycle 1
    s = advanceCycle(s); // cycle 2
    expect(s.cycleCount).toBe(2);
    for (const b of PERMANENT_BONUSES_BY_CYCLE[2]!) {
      expect(s.unlockedBonuses).toContain(b);
    }
  });

  it("throws when called past MAX_CYCLE", () => {
    const state: NewGamePlusState = {
      cycleCount: MAX_CYCLE,
      unlockedBonuses: PERMANENT_BONUSES_BY_CYCLE[MAX_CYCLE]!,
    };
    expect(() => advanceCycle(state)).toThrow();
  });

  it("does not duplicate bonuses across multiple advances", () => {
    let s = createInitialNgPlusState();
    s = advanceCycle(s);
    s = advanceCycle(s);
    const set = new Set(s.unlockedBonuses);
    expect(set.size).toBe(s.unlockedBonuses.length);
  });

  it("does not mutate the input state", () => {
    const s = createInitialNgPlusState();
    const snapshot = structuredClone(s);
    advanceCycle(s);
    expect(s).toEqual(snapshot);
  });
});
