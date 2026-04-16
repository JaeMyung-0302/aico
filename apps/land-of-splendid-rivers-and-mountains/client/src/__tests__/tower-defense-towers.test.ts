import { describe, it, expect } from "vitest";
import {
  TOWER_TYPES,
  TOWERS,
  SELL_REFUND_RATIO,
  getTowerDef,
  canAffordTower,
  purchaseTower,
  calcTowerRefund,
  calcWaveReward,
  type TowerType,
} from "../game/systems/tower-defense-towers";

describe("TOWERS and TOWER_TYPES", () => {
  it("defines at least 4 tower types", () => {
    expect(TOWER_TYPES.length).toBeGreaterThanOrEqual(4);
  });

  it("each type has a corresponding TowerDefinition", () => {
    for (const t of TOWER_TYPES) {
      expect(TOWERS[t]).toBeDefined();
      expect(TOWERS[t].type).toBe(t);
    }
  });

  it("each tower has positive cost, damage, range, and fire interval", () => {
    for (const t of TOWER_TYPES) {
      const def = TOWERS[t];
      expect(def.cost).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThan(0);
      expect(def.range).toBeGreaterThan(0);
      expect(def.fireIntervalMs).toBeGreaterThan(0);
    }
  });

  it("SELL_REFUND_RATIO is in (0, 1)", () => {
    expect(SELL_REFUND_RATIO).toBeGreaterThan(0);
    expect(SELL_REFUND_RATIO).toBeLessThan(1);
  });
});

describe("getTowerDef", () => {
  it("returns the definition for a valid type", () => {
    expect(getTowerDef(TOWER_TYPES[0]!)?.type).toBe(TOWER_TYPES[0]);
  });

  it("returns null for an unknown type", () => {
    expect(getTowerDef("nonexistent" as TowerType)).toBeNull();
  });
});

describe("canAffordTower", () => {
  it("ok when gold meets or exceeds cost", () => {
    const def = TOWERS[TOWER_TYPES[0]!];
    expect(canAffordTower(def.cost, def.type).ok).toBe(true);
    expect(canAffordTower(def.cost + 100, def.type).ok).toBe(true);
  });

  it("flags insufficientGold when below cost", () => {
    const def = TOWERS[TOWER_TYPES[0]!];
    const r = canAffordTower(def.cost - 1, def.type);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficientGold");
  });

  it("flags unknownTower for an unknown type", () => {
    const r = canAffordTower(99999, "not-real" as TowerType);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("unknownTower");
  });
});

describe("purchaseTower", () => {
  it("returns newGold = gold - cost", () => {
    const def = TOWERS[TOWER_TYPES[0]!];
    const r = purchaseTower(def.cost + 500, def.type);
    expect(r.newGold).toBe(500);
    expect(r.defId).toBe(def.type);
  });

  it("throws when player cannot afford", () => {
    const def = TOWERS[TOWER_TYPES[0]!];
    expect(() => purchaseTower(def.cost - 1, def.type)).toThrow();
  });

  it("throws on unknown tower type", () => {
    expect(() => purchaseTower(9999, "not-real" as TowerType)).toThrow();
  });
});

describe("calcTowerRefund", () => {
  it("returns floor(cost * SELL_REFUND_RATIO) for a known tower", () => {
    const def = TOWERS[TOWER_TYPES[0]!];
    expect(calcTowerRefund(def.type)).toBe(
      Math.floor(def.cost * SELL_REFUND_RATIO),
    );
  });

  it("returns 0 for an unknown tower type", () => {
    expect(calcTowerRefund("not-real" as TowerType)).toBe(0);
  });
});

describe("calcWaveReward", () => {
  it("returns a positive reward scaled by enemy count", () => {
    const small = calcWaveReward({ enemyCount: 3, isBossWave: false });
    const large = calcWaveReward({ enemyCount: 10, isBossWave: false });
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(small);
  });

  it("boss waves reward at least 2x a same-sized normal wave", () => {
    const enemyCount = 5;
    const normal = calcWaveReward({ enemyCount, isBossWave: false });
    const boss = calcWaveReward({ enemyCount, isBossWave: true });
    expect(boss).toBeGreaterThanOrEqual(normal * 2);
  });

  it("returns 0 for an empty wave", () => {
    expect(calcWaveReward({ enemyCount: 0, isBossWave: false })).toBe(0);
  });

  it("never returns a negative reward even on negative enemy count (defensive)", () => {
    expect(
      calcWaveReward({ enemyCount: -5, isBossWave: false }),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("purity", () => {
  it("TOWERS is not mutated by operations", () => {
    const snapshot = JSON.stringify(TOWERS);
    purchaseTower(9999, TOWER_TYPES[0]!);
    calcTowerRefund(TOWER_TYPES[0]!);
    calcWaveReward({ enemyCount: 5, isBossWave: true });
    expect(JSON.stringify(TOWERS)).toBe(snapshot);
  });
});
