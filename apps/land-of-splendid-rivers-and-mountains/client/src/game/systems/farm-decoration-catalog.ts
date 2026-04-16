export type DecorationCategory = "plant" | "stone" | "wooden" | "festive";

export interface DecorationCatalogItem {
  readonly id: string;
  readonly nameKey: string;
  readonly category: DecorationCategory;
  readonly w: number;
  readonly h: number;
  readonly cost: number;
}

export interface AffordCheck {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export interface PurchaseResult {
  readonly newGold: number;
  readonly itemId: string;
}

export const DECORATION_CATEGORIES: ReadonlyArray<DecorationCategory> = [
  "plant",
  "stone",
  "wooden",
  "festive",
];

export const DECORATION_CATALOG: ReadonlyArray<DecorationCatalogItem> = [
  // plants
  {
    id: "deco-flower-bed",
    nameKey: "deco.flowerBed",
    category: "plant",
    w: 1,
    h: 1,
    cost: 30,
  },
  {
    id: "deco-maple-tree",
    nameKey: "deco.mapleTree",
    category: "plant",
    w: 2,
    h: 2,
    cost: 150,
  },
  {
    id: "deco-bamboo-grove",
    nameKey: "deco.bambooGrove",
    category: "plant",
    w: 2,
    h: 3,
    cost: 220,
  },

  // stone
  {
    id: "deco-garden-stone",
    nameKey: "deco.gardenStone",
    category: "stone",
    w: 1,
    h: 1,
    cost: 50,
  },
  {
    id: "deco-stone-lantern",
    nameKey: "deco.stoneLantern",
    category: "stone",
    w: 1,
    h: 1,
    cost: 120,
  },

  // wooden
  {
    id: "deco-fence-short",
    nameKey: "deco.fenceShort",
    category: "wooden",
    w: 2,
    h: 1,
    cost: 40,
  },
  {
    id: "deco-wooden-bench",
    nameKey: "deco.woodenBench",
    category: "wooden",
    w: 2,
    h: 1,
    cost: 100,
  },

  // festive
  {
    id: "deco-paper-lantern",
    nameKey: "deco.paperLantern",
    category: "festive",
    w: 1,
    h: 1,
    cost: 80,
  },
  {
    id: "deco-festival-banner",
    nameKey: "deco.festivalBanner",
    category: "festive",
    w: 3,
    h: 1,
    cost: 250,
  },
];

const findItem = (id: string): DecorationCatalogItem | undefined =>
  DECORATION_CATALOG.find((i) => i.id === id);

export const getCatalogItem = (id: string): DecorationCatalogItem | null =>
  findItem(id) ?? null;

export const listByCategory = (
  category: DecorationCategory,
): ReadonlyArray<DecorationCatalogItem> =>
  DECORATION_CATALOG.filter((i) => i.category === category);

export const canAfford = (gold: number, id: string): AffordCheck => {
  const reasons: string[] = [];
  const item = findItem(id);
  if (!item) {
    reasons.push("unknownItem");
  } else if (gold < item.cost) {
    reasons.push("insufficientGold");
  }
  return { ok: reasons.length === 0, reasons };
};

export const purchaseDecoration = (
  gold: number,
  id: string,
): PurchaseResult => {
  const check = canAfford(gold, id);
  if (!check.ok) {
    throw new Error(
      `purchaseDecoration: rejected (${check.reasons.join(", ")})`,
    );
  }
  const item = DECORATION_CATALOG.find((i) => i.id === id)!;
  return { newGold: gold - item.cost, itemId: id };
};
