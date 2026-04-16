import { describe, it, expect } from "vitest";
import {
  PORTS,
  PRICE_TABLE,
  getBuyPrice,
  getSellPrice,
  getMargin,
  listMostProfitableRoutes,
  type Port,
} from "../game/systems/trade-prices";

describe("PORTS and PRICE_TABLE", () => {
  it("defines at least 3 ports", () => {
    expect(PORTS.length).toBeGreaterThanOrEqual(3);
  });

  it("every port has a price table entry", () => {
    for (const p of PORTS) {
      expect(PRICE_TABLE[p]).toBeDefined();
      expect(PRICE_TABLE[p].length).toBeGreaterThan(0);
    }
  });

  it("every entry has positive buyPrice and sellPrice", () => {
    for (const p of PORTS) {
      for (const entry of PRICE_TABLE[p]) {
        expect(entry.buyPrice).toBeGreaterThan(0);
        expect(entry.sellPrice).toBeGreaterThan(0);
      }
    }
  });

  it("buyPrice >= sellPrice within the same port (no free arbitrage locally)", () => {
    for (const p of PORTS) {
      for (const entry of PRICE_TABLE[p]) {
        expect(entry.buyPrice).toBeGreaterThanOrEqual(entry.sellPrice);
      }
    }
  });

  it("itemIds within a single port are unique", () => {
    for (const p of PORTS) {
      const ids = PRICE_TABLE[p].map((e) => e.itemId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("getBuyPrice / getSellPrice", () => {
  it("returns the listed buyPrice for a known item", () => {
    const firstPort = PORTS[0]!;
    const entry = PRICE_TABLE[firstPort][0]!;
    expect(getBuyPrice(firstPort, entry.itemId)).toBe(entry.buyPrice);
  });

  it("returns the listed sellPrice for a known item", () => {
    const firstPort = PORTS[0]!;
    const entry = PRICE_TABLE[firstPort][0]!;
    expect(getSellPrice(firstPort, entry.itemId)).toBe(entry.sellPrice);
  });

  it("returns null for an unknown item", () => {
    expect(getBuyPrice(PORTS[0]!, "nonexistent-item")).toBeNull();
    expect(getSellPrice(PORTS[0]!, "nonexistent-item")).toBeNull();
  });
});

describe("getMargin", () => {
  it("returns null when either endpoint lacks the item", () => {
    expect(getMargin(PORTS[0]!, PORTS[1]!, "nonexistent-item")).toBeNull();
  });

  it("returns sellPrice(to) - buyPrice(from) for a tradable item", () => {
    // Find a pair where both ports carry the same item.
    for (const from of PORTS) {
      for (const to of PORTS) {
        if (from === to) continue;
        for (const entry of PRICE_TABLE[from]) {
          const sellEntry = PRICE_TABLE[to].find(
            (e) => e.itemId === entry.itemId,
          );
          if (!sellEntry) continue;
          const margin = getMargin(from, to, entry.itemId);
          expect(margin).toBe(sellEntry.sellPrice - entry.buyPrice);
          return;
        }
      }
    }
  });

  it("returns 0 margin when fromPort === toPort and item exists", () => {
    const firstPort = PORTS[0]!;
    const entry = PRICE_TABLE[firstPort][0]!;
    const m = getMargin(firstPort, firstPort, entry.itemId);
    expect(m).toBe(entry.sellPrice - entry.buyPrice);
  });
});

describe("listMostProfitableRoutes", () => {
  it("returns routes sorted by margin descending", () => {
    // Pick an item that exists in at least two ports.
    const candidate = PRICE_TABLE[PORTS[0]!][0]!;
    const routes = listMostProfitableRoutes(candidate.itemId, 5);
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i - 1]!.margin).toBeGreaterThanOrEqual(routes[i]!.margin);
    }
  });

  it("limits the number of routes to the requested count", () => {
    const candidate = PRICE_TABLE[PORTS[0]!][0]!;
    const routes = listMostProfitableRoutes(candidate.itemId, 2);
    expect(routes.length).toBeLessThanOrEqual(2);
  });

  it("returns an empty list for unknown items", () => {
    expect(listMostProfitableRoutes("nonexistent-item", 5)).toEqual([]);
  });

  it("includes only routes where both endpoints carry the item", () => {
    const candidate = PRICE_TABLE[PORTS[0]!][0]!;
    const routes = listMostProfitableRoutes(candidate.itemId, 99);
    for (const r of routes) {
      expect(
        PRICE_TABLE[r.from].some((e) => e.itemId === candidate.itemId),
      ).toBe(true);
      expect(PRICE_TABLE[r.to].some((e) => e.itemId === candidate.itemId)).toBe(
        true,
      );
    }
  });

  it("excludes self-loops (from === to)", () => {
    const candidate = PRICE_TABLE[PORTS[0]!][0]!;
    const routes = listMostProfitableRoutes(candidate.itemId, 99);
    for (const r of routes) {
      expect(r.from).not.toBe(r.to);
    }
  });
});

describe("purity", () => {
  it("PRICE_TABLE is not mutated by operations", () => {
    const snapshot = JSON.stringify(PRICE_TABLE);
    const p: Port = PORTS[0]!;
    const entry = PRICE_TABLE[p][0]!;
    getBuyPrice(p, entry.itemId);
    getSellPrice(p, entry.itemId);
    getMargin(p, PORTS[1]!, entry.itemId);
    listMostProfitableRoutes(entry.itemId, 3);
    expect(JSON.stringify(PRICE_TABLE)).toBe(snapshot);
  });
});
