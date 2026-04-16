export interface DexCategory {
  readonly id: string;
  readonly nameKey: string;
  readonly totalEntries: number;
}

export interface DexMilestone {
  readonly percent: number;
  readonly itemId: string;
  readonly quantity: number;
  readonly titleKey: string;
}

export interface DexProgress {
  readonly discoveredByCategory: Readonly<Record<string, number>>;
}

// Categories align with existing data tables on main (crops/fish/monsters
// /recipes/npcs/items). totalEntries is intentionally conservative — tune
// during integration against the actual data files.
export const DEX_CATEGORIES: ReadonlyArray<DexCategory> = [
  { id: "crops", nameKey: "dex.crops", totalEntries: 16 },
  { id: "fish", nameKey: "dex.fish", totalEntries: 12 },
  { id: "monsters", nameKey: "dex.monsters", totalEntries: 10 },
  { id: "recipes", nameKey: "dex.recipes", totalEntries: 20 },
  { id: "npcs", nameKey: "dex.npcs", totalEntries: 10 },
];

export const DEX_MILESTONES: ReadonlyArray<DexMilestone> = [
  {
    percent: 25,
    itemId: "item-dex-badge-bronze",
    quantity: 1,
    titleKey: "dex.milestone.25",
  },
  {
    percent: 50,
    itemId: "item-dex-badge-silver",
    quantity: 1,
    titleKey: "dex.milestone.50",
  },
  {
    percent: 75,
    itemId: "item-dex-badge-gold",
    quantity: 1,
    titleKey: "dex.milestone.75",
  },
  {
    percent: 100,
    itemId: "item-dex-trophy",
    quantity: 1,
    titleKey: "dex.milestone.100",
  },
];

const clampPercent = (p: number): number => {
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
};

export const getCategoryCompletion = (
  category: DexCategory,
  progress: DexProgress,
): number => {
  const discovered = progress.discoveredByCategory[category.id] ?? 0;
  if (category.totalEntries <= 0) return 0;
  const ratio = discovered / category.totalEntries;
  return clampPercent(ratio * 100);
};

export const getOverallCompletion = (
  categories: ReadonlyArray<DexCategory>,
  progress: DexProgress,
): number => {
  if (categories.length === 0) return 0;
  let sum = 0;
  for (const c of categories) sum += getCategoryCompletion(c, progress);
  return sum / categories.length;
};

export const getUnlockedMilestones = (
  overallPercent: number,
): ReadonlyArray<DexMilestone> => {
  const clamped = clampPercent(overallPercent);
  return DEX_MILESTONES.filter((m) => m.percent <= clamped);
};

export const getNewlyUnlockedRewards = (
  prevPercent: number,
  newPercent: number,
): ReadonlyArray<DexMilestone> => {
  const prev = clampPercent(prevPercent);
  const next = clampPercent(newPercent);
  if (next <= prev) return [];
  return DEX_MILESTONES.filter((m) => m.percent > prev && m.percent <= next);
};
