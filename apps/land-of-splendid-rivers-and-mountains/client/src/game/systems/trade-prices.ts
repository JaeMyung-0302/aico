export type Port = "village" | "island" | "pirate-cove";

export interface TradeEntry {
  readonly itemId: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
}

export interface TradeRoute {
  readonly from: Port;
  readonly to: Port;
  readonly itemId: string;
  readonly margin: number;
}

export const PORTS: ReadonlyArray<Port> = ["village", "island", "pirate-cove"];

// 마을 상점이 베이스라인. 섬/해적 소굴은 품목·가격이 달라 교역 기회를 만든다.
// buyPrice >= sellPrice within a port (local spread prevents instant
// round-trip arbitrage at a single port).
export const PRICE_TABLE: Readonly<Record<Port, ReadonlyArray<TradeEntry>>> = {
  village: [
    { itemId: "crop-rice", buyPrice: 50, sellPrice: 30 },
    { itemId: "crop-ginseng", buyPrice: 300, sellPrice: 200 },
    { itemId: "iron", buyPrice: 80, sellPrice: 50 },
    { itemId: "item-silk-cloth", buyPrice: 150, sellPrice: 90 },
  ],
  island: [
    { itemId: "crop-rice", buyPrice: 80, sellPrice: 60 },
    { itemId: "fish-tuna", buyPrice: 90, sellPrice: 60 },
    { itemId: "item-coconut", buyPrice: 40, sellPrice: 25 },
    { itemId: "item-silk-cloth", buyPrice: 120, sellPrice: 85 },
  ],
  "pirate-cove": [
    { itemId: "crop-ginseng", buyPrice: 600, sellPrice: 420 },
    { itemId: "iron", buyPrice: 140, sellPrice: 100 },
    { itemId: "item-silk-cloth", buyPrice: 220, sellPrice: 150 },
    { itemId: "item-rum", buyPrice: 30, sellPrice: 18 },
  ],
};

export const getBuyPrice = (port: Port, itemId: string): number | null => {
  const entry = PRICE_TABLE[port].find((e) => e.itemId === itemId);
  return entry ? entry.buyPrice : null;
};

export const getSellPrice = (port: Port, itemId: string): number | null => {
  const entry = PRICE_TABLE[port].find((e) => e.itemId === itemId);
  return entry ? entry.sellPrice : null;
};

export const getMargin = (
  from: Port,
  to: Port,
  itemId: string,
): number | null => {
  const buy = getBuyPrice(from, itemId);
  const sell = getSellPrice(to, itemId);
  if (buy === null || sell === null) return null;
  return sell - buy;
};

export const listMostProfitableRoutes = (
  itemId: string,
  count: number,
): ReadonlyArray<TradeRoute> => {
  const routes: TradeRoute[] = [];
  for (const from of PORTS) {
    for (const to of PORTS) {
      if (from === to) continue;
      const margin = getMargin(from, to, itemId);
      if (margin === null) continue;
      routes.push({ from, to, itemId, margin });
    }
  }
  return routes
    .slice()
    .sort((a, b) => b.margin - a.margin)
    .slice(0, Math.max(0, count));
};
