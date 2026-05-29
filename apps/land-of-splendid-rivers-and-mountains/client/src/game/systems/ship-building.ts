export interface ShipRecipe {
  readonly id: string;
  readonly nameKey: string;
  readonly materials: Readonly<Record<string, number>>;
  readonly requiredGold: number;
}

export interface ShipBuildState {
  readonly shipId: string;
  readonly startedAtDay: number;
  readonly completedAtDay: number | null;
  readonly contributedMaterials: Readonly<Record<string, number>>;
}

export interface BuildCheckResult {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export const SHIP_RECIPES: ReadonlyArray<ShipRecipe> = [
  {
    id: "ship-raft",
    nameKey: "ship.raft",
    materials: { wood: 10 },
    requiredGold: 0,
  },
  {
    id: "ship-fishing-boat",
    nameKey: "ship.fishingBoat",
    materials: { wood: 30, iron: 5 },
    requiredGold: 500,
  },
  {
    id: "ship-galleon",
    nameKey: "ship.galleon",
    materials: {
      wood: 80,
      iron: 20,
      "item-silk-cloth": 10,
    },
    requiredGold: 2500,
  },
];

const recipeExists = (recipe: ShipRecipe): boolean =>
  SHIP_RECIPES.some((r) => r.id === recipe.id);

export const createBuildState = (
  shipId: string,
  currentDay: number,
): ShipBuildState => ({
  shipId,
  startedAtDay: currentDay,
  completedAtDay: null,
  contributedMaterials: {},
});

export const canStartBuild = (
  recipe: ShipRecipe,
  inventory: Readonly<Record<string, number>>,
  gold: number,
): BuildCheckResult => {
  const reasons: string[] = [];

  if (!recipeExists(recipe)) {
    reasons.push("unknownRecipe");
  }

  for (const [itemId, needed] of Object.entries(recipe.materials)) {
    const owned = inventory[itemId] ?? 0;
    if (owned < needed) {
      reasons.push("insufficientMaterial");
      break;
    }
  }

  if (gold < recipe.requiredGold) {
    reasons.push("insufficientGold");
  }

  return { ok: reasons.length === 0, reasons };
};

export const contributeMaterials = (
  state: ShipBuildState,
  itemId: string,
  quantity: number,
): ShipBuildState => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      `contributeMaterials: quantity must be > 0, got ${quantity}`,
    );
  }
  const prior = state.contributedMaterials[itemId] ?? 0;
  return {
    ...state,
    contributedMaterials: {
      ...state.contributedMaterials,
      [itemId]: prior + quantity,
    },
  };
};

export const isBuildComplete = (
  state: ShipBuildState,
  recipe: ShipRecipe,
): boolean => {
  for (const [itemId, needed] of Object.entries(recipe.materials)) {
    const contributed = state.contributedMaterials[itemId] ?? 0;
    if (contributed < needed) return false;
  }
  return true;
};

export const finalizeBuild = (
  state: ShipBuildState,
  recipe: ShipRecipe,
  currentDay: number,
): ShipBuildState => {
  if (state.completedAtDay !== null) {
    throw new Error(
      `finalizeBuild: build ${state.shipId} already finalized on day ${state.completedAtDay}`,
    );
  }
  if (!isBuildComplete(state, recipe)) {
    throw new Error(
      `finalizeBuild: build ${state.shipId} is not complete — missing materials`,
    );
  }
  return { ...state, completedAtDay: currentDay };
};
