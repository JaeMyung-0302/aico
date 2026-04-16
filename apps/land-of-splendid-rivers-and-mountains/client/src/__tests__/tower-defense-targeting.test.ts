import { describe, it, expect } from "vitest";
import {
  selectTarget,
  type TargetStrategy,
  type Tower,
  type TDEnemy,
} from "../game/systems/tower-defense-targeting";

const tower: Tower = { position: { x: 100, y: 100 }, range: 200 };

const makeEnemy = (overrides: Partial<TDEnemy> = {}): TDEnemy => ({
  id: "e0",
  position: { x: 100, y: 100 },
  hp: 50,
  maxHp: 100,
  pathProgress: 0,
  ...overrides,
});

describe("selectTarget — range filtering", () => {
  it("returns null when no enemies", () => {
    expect(selectTarget(tower, [], "closest")).toBeNull();
  });

  it("returns null when all enemies are outside range", () => {
    const enemies = [
      makeEnemy({ id: "a", position: { x: 1000, y: 1000 } }),
      makeEnemy({ id: "b", position: { x: -500, y: 0 } }),
    ];
    expect(selectTarget(tower, enemies, "closest")).toBeNull();
  });

  it("includes enemies exactly at the range boundary", () => {
    const enemy = makeEnemy({
      id: "edge",
      position: { x: 100 + 200, y: 100 }, // distance = 200 = tower.range
    });
    const result = selectTarget(tower, [enemy], "closest");
    expect(result?.id).toBe("edge");
  });

  it("excludes enemies just beyond the range boundary", () => {
    const enemy = makeEnemy({
      id: "outside",
      position: { x: 100 + 201, y: 100 },
    });
    expect(selectTarget(tower, [enemy], "closest")).toBeNull();
  });

  it("ignores out-of-range candidates even if one is ideal by strategy", () => {
    const enemies = [
      makeEnemy({ id: "far-strong", hp: 999, position: { x: 1000, y: 0 } }),
      makeEnemy({ id: "near-weak", hp: 1, position: { x: 120, y: 100 } }),
    ];
    const r = selectTarget(tower, enemies, "strongest");
    expect(r?.id).toBe("near-weak");
  });
});

describe("selectTarget — closest strategy", () => {
  it("picks the enemy with minimum distance to the tower", () => {
    const enemies = [
      makeEnemy({ id: "a", position: { x: 180, y: 100 } }), // dist 80
      makeEnemy({ id: "b", position: { x: 150, y: 100 } }), // dist 50
      makeEnemy({ id: "c", position: { x: 100, y: 200 } }), // dist 100
    ];
    expect(selectTarget(tower, enemies, "closest")?.id).toBe("b");
  });

  it("tiebreak on closest: earlier in the input list wins", () => {
    const enemies = [
      makeEnemy({ id: "a", position: { x: 150, y: 100 } }),
      makeEnemy({ id: "b", position: { x: 50, y: 100 } }),
    ];
    // both dist=50
    expect(selectTarget(tower, enemies, "closest")?.id).toBe("a");
  });
});

describe("selectTarget — first strategy (furthest along path)", () => {
  it("picks enemy with maximum pathProgress", () => {
    const enemies = [
      makeEnemy({ id: "back", pathProgress: 100 }),
      makeEnemy({ id: "lead", pathProgress: 500 }),
      makeEnemy({ id: "mid", pathProgress: 300 }),
    ];
    expect(selectTarget(tower, enemies, "first")?.id).toBe("lead");
  });

  it("tiebreak on first: earlier in the input list wins", () => {
    const enemies = [
      makeEnemy({ id: "a", pathProgress: 300 }),
      makeEnemy({ id: "b", pathProgress: 300 }),
    ];
    expect(selectTarget(tower, enemies, "first")?.id).toBe("a");
  });
});

describe("selectTarget — strongest strategy (max hp)", () => {
  it("picks enemy with maximum hp", () => {
    const enemies = [
      makeEnemy({ id: "mid", hp: 50 }),
      makeEnemy({ id: "boss", hp: 300 }),
      makeEnemy({ id: "weak", hp: 10 }),
    ];
    expect(selectTarget(tower, enemies, "strongest")?.id).toBe("boss");
  });
});

describe("selectTarget — weakest strategy (min hp)", () => {
  it("picks enemy with minimum hp", () => {
    const enemies = [
      makeEnemy({ id: "mid", hp: 50 }),
      makeEnemy({ id: "boss", hp: 300 }),
      makeEnemy({ id: "weak", hp: 10 }),
    ];
    expect(selectTarget(tower, enemies, "weakest")?.id).toBe("weak");
  });

  it("treats dead enemies (hp=0) as still selectable for weakest (filter is caller's job)", () => {
    const enemies = [
      makeEnemy({ id: "dead", hp: 0 }),
      makeEnemy({ id: "alive", hp: 10 }),
    ];
    expect(selectTarget(tower, enemies, "weakest")?.id).toBe("dead");
  });
});

describe("selectTarget — purity", () => {
  it("does not mutate the input enemies array", () => {
    const enemies = [
      makeEnemy({ id: "a" }),
      makeEnemy({ id: "b", position: { x: 150, y: 100 } }),
    ];
    const snapshot = structuredClone(enemies);
    selectTarget(tower, enemies, "closest");
    expect(enemies).toEqual(snapshot);
  });

  it("does not mutate the tower", () => {
    const t: Tower = { position: { x: 100, y: 100 }, range: 200 };
    const snapshot = structuredClone(t);
    selectTarget(t, [makeEnemy()], "closest");
    expect(t).toEqual(snapshot);
  });
});

describe("selectTarget — strategy exhaustiveness", () => {
  it("supports all declared TargetStrategy variants", () => {
    const strategies: ReadonlyArray<TargetStrategy> = [
      "closest",
      "first",
      "strongest",
      "weakest",
    ];
    const enemies = [makeEnemy({ id: "only" })];
    for (const s of strategies) {
      expect(selectTarget(tower, enemies, s)?.id).toBe("only");
    }
  });
});
