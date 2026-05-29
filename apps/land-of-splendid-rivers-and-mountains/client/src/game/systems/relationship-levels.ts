export interface RelationReward {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RelationLevel {
  readonly level: number;
  readonly titleKey: string;
  readonly reward?: RelationReward;
}

export const MIN_RELATION = 0;
export const MAX_RELATION = 10;

// 11 entries (0..10). Ch.3 rules: friendship at 6, confidant at 8
// (unlocks dating), beloved at 10 (unlocks proposal — matches
// MIN_RELATION_TO_PROPOSE on feature/ch3-marriage-proposal-logic).
export const REL_LEVELS: ReadonlyArray<RelationLevel> = [
  { level: 0, titleKey: "relation.stranger" },
  {
    level: 1,
    titleKey: "relation.acquainted",
    reward: { itemId: "drop-wild-herb", quantity: 1 },
  },
  { level: 2, titleKey: "relation.familiar" },
  {
    level: 3,
    titleKey: "relation.warm",
    reward: { itemId: "food-rice-cake", quantity: 2 },
  },
  { level: 4, titleKey: "relation.close" },
  {
    level: 5,
    titleKey: "relation.trusted",
    reward: { itemId: "iron", quantity: 3 },
  },
  {
    level: 6,
    titleKey: "relation.friend",
    reward: { itemId: "seed-ginseng", quantity: 2 },
  },
  { level: 7, titleKey: "relation.companion" },
  {
    level: 8,
    titleKey: "relation.confidant",
    reward: { itemId: "item-love-letter", quantity: 1 },
  },
  { level: 9, titleKey: "relation.devoted" },
  {
    level: 10,
    titleKey: "relation.beloved",
    reward: { itemId: "item-wedding-ring", quantity: 1 },
  },
];

const clampLevel = (n: number): number => {
  if (n < MIN_RELATION) return MIN_RELATION;
  if (n > MAX_RELATION) return MAX_RELATION;
  return Math.floor(n);
};

export const getCurrentLevel = (relation: number): RelationLevel =>
  REL_LEVELS[clampLevel(relation)]!;

export const getRewardsBetween = (
  prev: number,
  next: number,
): ReadonlyArray<RelationReward> => {
  const prevLevel = clampLevel(prev);
  const nextLevel = clampLevel(next);
  if (nextLevel <= prevLevel) return [];

  const rewards: RelationReward[] = [];
  for (let level = prevLevel + 1; level <= nextLevel; level++) {
    const entry = REL_LEVELS[level];
    if (entry?.reward) rewards.push(entry.reward);
  }
  return rewards;
};
