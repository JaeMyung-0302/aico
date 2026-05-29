import { describe, it, expect } from "vitest";
import {
  canExecute,
  executeTrade,
  applyOrders,
  createTradeState,
  type TradeState,
  type TradeOrder,
} from "../game/systems/trade-transaction";

const state = (overrides: Partial<TradeState> = {}): TradeState => ({
  gold: 1000,
  items: {},
  ...overrides,
});

const buy = (
  itemId: string,
  quantity: number,
  unitPrice: number,
): TradeOrder => ({
  type: "buy",
  itemId,
  quantity,
  unitPrice,
});

const sell = (
  itemId: string,
  quantity: number,
  unitPrice: number,
): TradeOrder => ({
  type: "sell",
  itemId,
  quantity,
  unitPrice,
});

describe("createTradeState", () => {
  it("starts with zero gold and empty items by default", () => {
    const s = createTradeState();
    expect(s.gold).toBe(0);
    expect(s.items).toEqual({});
  });

  it("accepts initial values", () => {
    const s = createTradeState({ gold: 500, items: { "crop-rice": 3 } });
    expect(s.gold).toBe(500);
    expect(s.items["crop-rice"]).toBe(3);
  });
});

describe("canExecute — buy", () => {
  it("ok when gold is sufficient", () => {
    const r = canExecute(state({ gold: 100 }), buy("crop-rice", 2, 30));
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags insufficientGold when below total cost", () => {
    const r = canExecute(state({ gold: 50 }), buy("crop-rice", 2, 30));
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficientGold");
  });

  it("flags invalidQuantity for zero quantity", () => {
    const r = canExecute(state(), buy("crop-rice", 0, 30));
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("invalidQuantity");
  });

  it("flags invalidQuantity for negative quantity", () => {
    const r = canExecute(state(), buy("crop-rice", -1, 30));
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("invalidQuantity");
  });

  it("flags invalidPrice for non-positive unitPrice", () => {
    expect(canExecute(state(), buy("x", 1, 0)).reasons).toContain(
      "invalidPrice",
    );
    expect(canExecute(state(), buy("x", 1, -5)).reasons).toContain(
      "invalidPrice",
    );
  });
});

describe("canExecute — sell", () => {
  it("ok when inventory has enough", () => {
    const r = canExecute(
      state({ items: { "crop-rice": 5 } }),
      sell("crop-rice", 3, 20),
    );
    expect(r.ok).toBe(true);
  });

  it("flags insufficientInventory when quantity exceeds stock", () => {
    const r = canExecute(
      state({ items: { "crop-rice": 2 } }),
      sell("crop-rice", 3, 20),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficientInventory");
  });

  it("flags insufficientInventory when item is missing entirely", () => {
    const r = canExecute(state(), sell("nonexistent", 1, 20));
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficientInventory");
  });
});

describe("executeTrade — buy", () => {
  it("decreases gold by total cost and increases item quantity", () => {
    const s0 = state({ gold: 200 });
    const s1 = executeTrade(s0, buy("crop-rice", 3, 30));
    expect(s1.gold).toBe(110);
    expect(s1.items["crop-rice"]).toBe(3);
  });

  it("stacks on an existing item stock", () => {
    const s0 = state({ items: { "crop-rice": 2 } });
    const s1 = executeTrade(s0, buy("crop-rice", 4, 10));
    expect(s1.items["crop-rice"]).toBe(6);
  });

  it("throws when canExecute fails", () => {
    expect(() =>
      executeTrade(state({ gold: 10 }), buy("crop-rice", 5, 30)),
    ).toThrow();
  });
});

describe("executeTrade — sell", () => {
  it("increases gold and decrements item quantity", () => {
    const s0 = state({ gold: 0, items: { "crop-rice": 5 } });
    const s1 = executeTrade(s0, sell("crop-rice", 3, 20));
    expect(s1.gold).toBe(60);
    expect(s1.items["crop-rice"]).toBe(2);
  });

  it("drops item from inventory when quantity reaches 0", () => {
    const s0 = state({ items: { "crop-rice": 3 } });
    const s1 = executeTrade(s0, sell("crop-rice", 3, 10));
    expect(s1.items["crop-rice"]).toBeUndefined();
  });

  it("throws when canExecute fails", () => {
    expect(() =>
      executeTrade(
        state({ items: { "crop-rice": 1 } }),
        sell("crop-rice", 5, 10),
      ),
    ).toThrow();
  });
});

describe("applyOrders", () => {
  it("applies orders sequentially (left fold)", () => {
    const s = applyOrders(state({ gold: 500, items: {} }), [
      buy("crop-rice", 2, 30),
      buy("iron", 1, 80),
      sell("crop-rice", 1, 40),
    ]);
    // after buy rice: gold=440, rice=2
    // after buy iron: gold=360, iron=1
    // after sell rice: gold=400, rice=1
    expect(s.gold).toBe(400);
    expect(s.items["crop-rice"]).toBe(1);
    expect(s.items["iron"]).toBe(1);
  });

  it("throws on the first invalid order and does not apply subsequent ones", () => {
    expect(() =>
      applyOrders(state({ gold: 50 }), [
        buy("crop-rice", 10, 30), // invalid: 300 > 50
        buy("iron", 1, 10),
      ]),
    ).toThrow();
  });
});

describe("purity", () => {
  it("executeTrade does not mutate input state", () => {
    const s0 = state({ gold: 200, items: { x: 1 } });
    const snapshot = structuredClone(s0);
    executeTrade(s0, buy("x", 1, 10));
    expect(s0).toEqual(snapshot);
  });

  it("applyOrders does not mutate input state", () => {
    const s0 = state({ gold: 200 });
    const snapshot = structuredClone(s0);
    applyOrders(s0, [buy("x", 1, 10)]);
    expect(s0).toEqual(snapshot);
  });
});
