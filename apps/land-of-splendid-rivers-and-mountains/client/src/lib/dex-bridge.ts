import { eventBus } from "./event-bus";
import { useGameStore } from "@/stores/useGameStore";
import {
  DEX_CATEGORIES,
  getNewlyUnlockedRewards,
  getOverallCompletion,
} from "@/game/systems/dex-rewards";
import {
  getCookingRecipes,
  getFermentationRecipes,
} from "@/game/systems/fermentation";

let cleanup: (() => void) | null = null;
let resultToRecipe: Map<string, string> | null = null;

/** 요리/발효 결과물 itemId → recipeId (도감 "recipes" 발견 판정용) */
const getResultMap = (): Map<string, string> => {
  if (!resultToRecipe) {
    resultToRecipe = new Map();
    for (const r of [...getCookingRecipes(), ...getFermentationRecipes()]) {
      resultToRecipe.set(r.resultItemId, r.id);
    }
  }
  return resultToRecipe;
};

const discover = (categoryId: string, entryId: string): void => {
  const state = useGameStore.getState();
  const current = state.dexDiscovered[categoryId] ?? [];
  if (current.includes(entryId)) return;

  const progress = { discoveredByCategory: toCounts(state.dexDiscovered) };
  const prevPercent = getOverallCompletion(DEX_CATEGORIES, progress);

  const nextDiscovered = {
    ...state.dexDiscovered,
    [categoryId]: [...current, entryId],
  };
  state.setDexDiscovered(nextDiscovered);

  const nextPercent = getOverallCompletion(DEX_CATEGORIES, {
    discoveredByCategory: toCounts(nextDiscovered),
  });
  const granted = useGameStore.getState().dexMilestonesGranted;
  const newly = getNewlyUnlockedRewards(prevPercent, nextPercent).filter(
    (m) => !granted.includes(m.percent),
  );
  if (newly.length === 0) return;

  useGameStore
    .getState()
    .setDexMilestonesGranted([...granted, ...newly.map((m) => m.percent)]);
  for (const m of newly) {
    // 인벤토리는 씬 로컬이므로 씬에 배선된 event:reward 핸들러로 지급
    eventBus.emit("event:reward", {
      eventId: `dex-milestone-${m.percent}`,
      goldReward: 0,
      items: [{ itemId: m.itemId, quantity: m.quantity }],
    });
  }
};

const toCounts = (
  discovered: Readonly<Record<string, ReadonlyArray<string>>>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(discovered)) {
    counts[k] = v.length;
  }
  return counts;
};

const onHarvested = ({ cropId }: { cropId: string }) =>
  discover("crops", cropId);
const onFishCaught = ({ fishId }: { fishId: string }) =>
  discover("fish", fishId);
const onDefeated = ({ monsterId }: { monsterId: string }) =>
  discover("monsters", monsterId);
const onTalked = ({ npcId }: { npcId: string }) => discover("npcs", npcId);
const onInventoryChanged = ({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) => {
  if (quantity <= 0) return;
  const recipeId = getResultMap().get(itemId);
  if (recipeId) discover("recipes", recipeId);
};

/** 도감 발견 추적 글로벌 브리지 (Ch.6) — store-bridge와 동일 라이프사이클 */
export const initDexBridge = (): void => {
  if (cleanup) return;

  eventBus.on("farm:harvested", onHarvested);
  eventBus.on("fishing:caught", onFishCaught);
  eventBus.on("combat:defeated", onDefeated);
  eventBus.on("npc:talked", onTalked);
  eventBus.on("inventory:changed", onInventoryChanged);

  cleanup = () => {
    eventBus.off("farm:harvested", onHarvested);
    eventBus.off("fishing:caught", onFishCaught);
    eventBus.off("combat:defeated", onDefeated);
    eventBus.off("npc:talked", onTalked);
    eventBus.off("inventory:changed", onInventoryChanged);
    cleanup = null;
  };
};

export const destroyDexBridge = (): void => {
  cleanup?.();
};
