import { describe, it, expect } from "vitest";
import {
  createInitialRun,
  startRun,
  advanceFloor,
  collectItem,
  collectGold,
  abandonRun,
  completeRun,
  failRun,
  type DungeonRunState,
} from "../game/systems/dungeon-run-state";

describe("createInitialRun", () => {
  it("returns an inactive empty run", () => {
    const r = createInitialRun();
    expect(r.active).toBe(false);
    expect(r.currentFloor).toBe(0);
    expect(r.inventory).toEqual([]);
    expect(r.goldCollected).toBe(0);
  });

  it("returns a fresh object each call", () => {
    expect(createInitialRun()).not.toBe(createInitialRun());
  });
});

describe("startRun", () => {
  it("activates the run starting at floor 1", () => {
    const r = startRun(createInitialRun());
    expect(r.active).toBe(true);
    expect(r.currentFloor).toBe(1);
  });

  it("throws if a run is already active", () => {
    const active = startRun(createInitialRun());
    expect(() => startRun(active)).toThrow();
  });

  it("does not mutate the input state", () => {
    const s = createInitialRun();
    const snap = structuredClone(s);
    startRun(s);
    expect(s).toEqual(snap);
  });
});

describe("advanceFloor", () => {
  it("increments currentFloor", () => {
    const s = startRun(createInitialRun());
    const next = advanceFloor(s);
    expect(next.currentFloor).toBe(2);
  });

  it("preserves inventory and gold across floors", () => {
    let s = startRun(createInitialRun());
    s = collectItem(s, "drop-rare");
    s = collectGold(s, 50);
    const next = advanceFloor(s);
    expect(next.inventory).toContain("drop-rare");
    expect(next.goldCollected).toBe(50);
  });

  it("throws if the run is not active", () => {
    expect(() => advanceFloor(createInitialRun())).toThrow();
  });
});

describe("collectItem", () => {
  it("appends an item to the inventory", () => {
    const s = collectItem(startRun(createInitialRun()), "drop-shard");
    expect(s.inventory).toEqual(["drop-shard"]);
  });

  it("preserves order across multiple items", () => {
    let s = startRun(createInitialRun());
    s = collectItem(s, "a");
    s = collectItem(s, "b");
    s = collectItem(s, "c");
    expect(s.inventory).toEqual(["a", "b", "c"]);
  });

  it("throws if the run is not active", () => {
    expect(() => collectItem(createInitialRun(), "x")).toThrow();
  });
});

describe("collectGold", () => {
  it("accumulates gold", () => {
    let s = startRun(createInitialRun());
    s = collectGold(s, 10);
    s = collectGold(s, 20);
    expect(s.goldCollected).toBe(30);
  });

  it("rejects negative amounts", () => {
    const s = startRun(createInitialRun());
    expect(() => collectGold(s, -5)).toThrow();
  });

  it("throws if the run is not active", () => {
    expect(() => collectGold(createInitialRun(), 10)).toThrow();
  });
});

describe("abandonRun", () => {
  it("returns a result with outcome 'abandoned' and resets state", () => {
    let s = startRun(createInitialRun());
    s = advanceFloor(s);
    s = collectItem(s, "x");
    s = collectGold(s, 100);
    const { result, next } = abandonRun(s);
    expect(result.outcome).toBe("abandoned");
    expect(result.floor).toBe(2);
    expect(result.gold).toBe(100);
    expect(result.items).toEqual(["x"]);
    expect(next.active).toBe(false);
    expect(next.currentFloor).toBe(0);
    expect(next.inventory).toEqual([]);
  });

  it("throws when no run is active", () => {
    expect(() => abandonRun(createInitialRun())).toThrow();
  });
});

describe("completeRun", () => {
  it("returns a result with outcome 'completed' and full rewards", () => {
    let s = startRun(createInitialRun());
    s = advanceFloor(s);
    s = collectGold(s, 200);
    const { result, next } = completeRun(s);
    expect(result.outcome).toBe("completed");
    expect(result.floor).toBe(2);
    expect(result.gold).toBe(200);
    expect(next.active).toBe(false);
  });

  it("throws when no run is active", () => {
    expect(() => completeRun(createInitialRun())).toThrow();
  });
});

describe("failRun", () => {
  it("returns a result with outcome 'failed'", () => {
    const s = startRun(createInitialRun());
    const { result, next } = failRun(s);
    expect(result.outcome).toBe("failed");
    expect(next.active).toBe(false);
  });

  it("throws when no run is active", () => {
    expect(() => failRun(createInitialRun())).toThrow();
  });
});

describe("purity (no input mutation)", () => {
  const setup = (): DungeonRunState => {
    let s = startRun(createInitialRun());
    s = collectItem(s, "x");
    s = collectGold(s, 50);
    return s;
  };

  it("advanceFloor does not mutate", () => {
    const s = setup();
    const snap = structuredClone(s);
    advanceFloor(s);
    expect(s).toEqual(snap);
  });

  it("collectItem does not mutate", () => {
    const s = setup();
    const snap = structuredClone(s);
    collectItem(s, "y");
    expect(s).toEqual(snap);
  });

  it("abandonRun does not mutate", () => {
    const s = setup();
    const snap = structuredClone(s);
    abandonRun(s);
    expect(s).toEqual(snap);
  });
});
