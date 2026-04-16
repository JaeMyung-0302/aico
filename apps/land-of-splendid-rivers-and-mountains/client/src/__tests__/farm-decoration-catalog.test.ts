import { describe, it, expect } from "vitest";
import {
  DECORATION_CATEGORIES,
  DECORATION_CATALOG,
  getCatalogItem,
  listByCategory,
  canAfford,
  purchaseDecoration,
  type DecorationCategory,
} from "../game/systems/farm-decoration-catalog";

describe("DECORATION_CATEGORIES", () => {
  it("contains at least 3 categories", () => {
    expect(DECORATION_CATEGORIES.length).toBeGreaterThanOrEqual(3);
  });

  it("has no duplicate category ids", () => {
    const set = new Set(DECORATION_CATEGORIES);
    expect(set.size).toBe(DECORATION_CATEGORIES.length);
  });
});

describe("DECORATION_CATALOG", () => {
  it("has at least one item per category", () => {
    for (const c of DECORATION_CATEGORIES) {
      const items = DECORATION_CATALOG.filter((i) => i.category === c);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it("all ids are unique", () => {
    const ids = DECORATION_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has positive footprint and non-negative cost", () => {
    for (const item of DECORATION_CATALOG) {
      expect(item.w).toBeGreaterThan(0);
      expect(item.h).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getCatalogItem", () => {
  it("returns the matching item for a valid id", () => {
    const first = DECORATION_CATALOG[0]!;
    expect(getCatalogItem(first.id)).toEqual(first);
  });

  it("returns null for an unknown id", () => {
    expect(getCatalogItem("not-a-real-item")).toBeNull();
  });
});

describe("listByCategory", () => {
  it("returns only items of the given category", () => {
    const cat: DecorationCategory = DECORATION_CATEGORIES[0]!;
    for (const item of listByCategory(cat)) {
      expect(item.category).toBe(cat);
    }
  });

  it("returns an empty array for an unknown category", () => {
    expect(listByCategory("nonexistent" as DecorationCategory)).toEqual([]);
  });
});

describe("canAfford", () => {
  it("ok when gold meets or exceeds the item's cost", () => {
    const item = DECORATION_CATALOG[0]!;
    expect(canAfford(item.cost, item.id).ok).toBe(true);
    expect(canAfford(item.cost + 500, item.id).ok).toBe(true);
  });

  it("flags insufficientGold when below cost", () => {
    const paid = DECORATION_CATALOG.find((i) => i.cost > 0);
    if (!paid) return;
    const r = canAfford(paid.cost - 1, paid.id);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficientGold");
  });

  it("flags unknownItem for an unknown id", () => {
    const r = canAfford(9999, "not-real");
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("unknownItem");
  });
});

describe("purchaseDecoration", () => {
  it("returns newGold = gold - cost for an affordable buy", () => {
    const item = DECORATION_CATALOG[0]!;
    const r = purchaseDecoration(item.cost + 100, item.id);
    expect(r.newGold).toBe(100);
    expect(r.itemId).toBe(item.id);
  });

  it("throws on insufficient gold", () => {
    const paid = DECORATION_CATALOG.find((i) => i.cost > 0);
    if (!paid) return;
    expect(() => purchaseDecoration(paid.cost - 1, paid.id)).toThrow();
  });

  it("throws on unknown item id", () => {
    expect(() => purchaseDecoration(9999, "not-real")).toThrow();
  });
});

describe("purity", () => {
  it("DECORATION_CATALOG is not mutated by operations", () => {
    const snapshot = JSON.stringify(DECORATION_CATALOG);
    getCatalogItem("anything");
    listByCategory(DECORATION_CATEGORIES[0]!);
    try {
      purchaseDecoration(9999, "ignore");
    } catch {
      // expected
    }
    expect(JSON.stringify(DECORATION_CATALOG)).toBe(snapshot);
  });
});
