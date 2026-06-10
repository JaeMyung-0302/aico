import type {
  CropDefinition,
  ItemDefinition,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { InventorySystem } from "./inventory";
import cropsData from "../data/crops.json";
import itemsData from "../data/items.json";

const cropMap = new Map<string, CropDefinition>(
  (cropsData as ReadonlyArray<CropDefinition>).map((c) => [c.id, c]),
);
const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((i) => [i.id, i]),
);

// 도구 판매가 (대장간). 도구는 비스택형 — 미보유 시에만 구매 가능.
// 물뿌리개는 시작 지급, 낚싯대는 퀘스트 보상이므로 분실 대비 저가 재구매용.
export const TOOL_PRICES: Readonly<Record<string, number>> = {
  "tool-hoe": 300,
  "tool-axe": 500,
  "tool-pickaxe": 500,
  "tool-sword": 800,
  "tool-wateringCan": 100,
  "tool-fishingRod": 400,
};

/**
 * 씬 공용 상점 구매/판매 핸들러 등록.
 * ShopPanel은 어느 씬에서나 열 수 있으므로, InventorySystem을 가진 씬은
 * 반드시 이 핸들러를 등록해야 구매/판매가 동작한다.
 * 반환된 cleanup 함수를 씬 shutdown에서 호출할 것.
 */
export const setupShopHandlers = (
  inventory: InventorySystem,
  syncInventory: () => void,
): (() => void) => {
  const onShopBuy = ({ itemId }: { itemId: string }) => {
    let price: number;
    if (itemId.startsWith("seed-")) {
      const cropDef = cropMap.get(itemId.slice(5));
      if (!cropDef) return;
      price = cropDef.seedPrice;
    } else if (TOOL_PRICES[itemId] !== undefined) {
      if (inventory.hasItem(itemId)) return;
      price = TOOL_PRICES[itemId];
    } else {
      return;
    }

    const store = useGameStore.getState();
    if (store.gold < price) return;
    if (!inventory.addItem(itemId)) return;
    eventBus.emit("gold:changed", {
      amount: -price,
      total: store.gold - price,
    });
    syncInventory();
  };

  const onShopSell = ({
    itemId,
    quantity,
  }: {
    itemId: string;
    quantity: number;
  }) => {
    const def = itemMap.get(itemId);
    if (!def || def.sellPrice <= 0) return;
    if (!inventory.hasItem(itemId, quantity)) return;

    inventory.removeItem(itemId, quantity);
    const earnings = def.sellPrice * quantity;
    const store = useGameStore.getState();
    eventBus.emit("gold:changed", {
      amount: earnings,
      total: store.gold + earnings,
    });
    syncInventory();
  };

  eventBus.on("shop:buy", onShopBuy);
  eventBus.on("shop:sell", onShopSell);
  return () => {
    eventBus.off("shop:buy", onShopBuy);
    eventBus.off("shop:sell", onShopSell);
  };
};
