import { describe, it, expect } from "vitest";
import {
  SHIP_RECIPES,
  createBuildState,
  canStartBuild,
  contributeMaterials,
  isBuildComplete,
  finalizeBuild,
  type ShipBuildState,
  type ShipRecipe,
} from "../game/systems/ship-building";

const recipe = (): ShipRecipe => SHIP_RECIPES[0]!;

describe("SHIP_RECIPES", () => {
  it("defines at least 3 recipes (raft → fishing boat → galleon)", () => {
    expect(SHIP_RECIPES.length).toBeGreaterThanOrEqual(3);
  });

  it("each recipe has positive material requirements and a non-negative gold cost", () => {
    for (const r of SHIP_RECIPES) {
      for (const v of Object.values(r.materials)) {
        expect(v).toBeGreaterThan(0);
      }
      expect(r.requiredGold).toBeGreaterThanOrEqual(0);
    }
  });

  it("recipe ids are unique", () => {
    const ids = SHIP_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recipes sorted by tier have non-decreasing gold cost", () => {
    for (let i = 1; i < SHIP_RECIPES.length; i++) {
      expect(SHIP_RECIPES[i]!.requiredGold).toBeGreaterThanOrEqual(
        SHIP_RECIPES[i - 1]!.requiredGold,
      );
    }
  });
});

describe("createBuildState", () => {
  it("returns a fresh in-progress state with empty contributions", () => {
    const s = createBuildState(recipe().id, 42);
    expect(s.shipId).toBe(recipe().id);
    expect(s.startedAtDay).toBe(42);
    expect(s.completedAtDay).toBeNull();
    expect(s.contributedMaterials).toEqual({});
  });

  it("returns a fresh object each call", () => {
    expect(createBuildState("x", 1)).not.toBe(createBuildState("x", 1));
  });
});

describe("canStartBuild", () => {
  it("ok when inventory and gold cover requirements", () => {
    const r = recipe();
    const inventory: Readonly<Record<string, number>> = Object.fromEntries(
      Object.entries(r.materials).map(([k, v]) => [k, v + 5]),
    );
    const result = canStartBuild(r, inventory, r.requiredGold + 100);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("flags insufficientMaterial when an item is short", () => {
    const r = recipe();
    const keys = Object.keys(r.materials);
    const short = keys[0]!;
    const inventory: Readonly<Record<string, number>> = {
      ...Object.fromEntries(keys.map((k) => [k, r.materials[k]!])),
      [short]: r.materials[short]! - 1,
    };
    const result = canStartBuild(r, inventory, r.requiredGold);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("insufficientMaterial");
  });

  it("flags insufficientGold when below requiredGold", () => {
    const r = recipe();
    const inventory = r.materials;
    const result = canStartBuild(r, inventory, r.requiredGold - 1);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("insufficientGold");
  });

  it("flags unknownRecipe when recipe is not in the table", () => {
    const result = canStartBuild(
      { id: "mystery", nameKey: "x", materials: {}, requiredGold: 0 },
      {},
      9999,
    );
    expect(result.reasons).toContain("unknownRecipe");
  });
});

describe("contributeMaterials", () => {
  it("increments the contributed pool for the given itemId", () => {
    const s = createBuildState(recipe().id, 1);
    const keys = Object.keys(recipe().materials);
    const key = keys[0]!;
    const next = contributeMaterials(s, key, 3);
    expect(next.contributedMaterials[key]).toBe(3);
  });

  it("stacks with existing contributions", () => {
    const s1 = contributeMaterials(createBuildState(recipe().id, 1), "wood", 2);
    const s2 = contributeMaterials(s1, "wood", 3);
    expect(s2.contributedMaterials["wood"]).toBe(5);
  });

  it("throws on non-positive quantity", () => {
    const s = createBuildState(recipe().id, 1);
    expect(() => contributeMaterials(s, "wood", 0)).toThrow();
    expect(() => contributeMaterials(s, "wood", -1)).toThrow();
  });

  it("does not mutate input state", () => {
    const s = createBuildState(recipe().id, 1);
    const snapshot = structuredClone(s);
    contributeMaterials(s, "wood", 1);
    expect(s).toEqual(snapshot);
  });
});

describe("isBuildComplete", () => {
  it("false when no materials contributed yet", () => {
    expect(isBuildComplete(createBuildState(recipe().id, 1), recipe())).toBe(
      false,
    );
  });

  it("false when one required material is short", () => {
    const r = recipe();
    let s = createBuildState(r.id, 1);
    for (const [mat, qty] of Object.entries(r.materials)) {
      s = contributeMaterials(s, mat, qty);
    }
    // now remove 1 from the first material to make it short
    const firstMat = Object.keys(r.materials)[0]!;
    s = {
      ...s,
      contributedMaterials: {
        ...s.contributedMaterials,
        [firstMat]: r.materials[firstMat]! - 1,
      },
    };
    expect(isBuildComplete(s, r)).toBe(false);
  });

  it("true once every required material is fully contributed", () => {
    const r = recipe();
    let s = createBuildState(r.id, 1);
    for (const [mat, qty] of Object.entries(r.materials)) {
      s = contributeMaterials(s, mat, qty);
    }
    expect(isBuildComplete(s, r)).toBe(true);
  });

  it("still true with extra contributions beyond the requirement", () => {
    const r = recipe();
    let s = createBuildState(r.id, 1);
    for (const [mat, qty] of Object.entries(r.materials)) {
      s = contributeMaterials(s, mat, qty + 3);
    }
    expect(isBuildComplete(s, r)).toBe(true);
  });
});

describe("finalizeBuild", () => {
  it("sets completedAtDay when build is complete", () => {
    const r = recipe();
    let s = createBuildState(r.id, 1);
    for (const [mat, qty] of Object.entries(r.materials)) {
      s = contributeMaterials(s, mat, qty);
    }
    const done = finalizeBuild(s, r, 10);
    expect(done.completedAtDay).toBe(10);
  });

  it("throws when build is not yet complete", () => {
    const s = createBuildState(recipe().id, 1);
    expect(() => finalizeBuild(s, recipe(), 10)).toThrow();
  });

  it("throws when already finalized", () => {
    const r = recipe();
    let s: ShipBuildState = createBuildState(r.id, 1);
    for (const [mat, qty] of Object.entries(r.materials)) {
      s = contributeMaterials(s, mat, qty);
    }
    const done = finalizeBuild(s, r, 10);
    expect(() => finalizeBuild(done, r, 20)).toThrow();
  });
});
