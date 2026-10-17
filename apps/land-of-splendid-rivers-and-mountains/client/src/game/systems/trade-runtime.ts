import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { InventorySystem } from "./inventory";
import { getBuyPrice, getSellPrice, type Port } from "./trade-prices";
import {
  canExecute,
  type TradeOrder,
  type TradeState,
} from "./trade-transaction";

/**
 * 항구 교역 런타임 (Ch.4): 항구별 가격표 기반 매수/매도.
 * 항구가 있는 씬(Market=village, Island=island, Pirate=pirate-cove)에서만 등록.
 * 반환된 cleanup을 씬 shutdown에서 호출할 것.
 */
export const setupTradeHandler = (
  inventory: InventorySystem,
  syncInventory: () => void,
  port: Port,
): (() => void) => {
  const tradeState = (): TradeState => {
    const items: Record<string, number> = {};
    for (const slot of inventory.getSlots()) {
      if (slot) items[slot.itemId] = (items[slot.itemId] ?? 0) + slot.quantity;
    }
    return { gold: useGameStore.getState().gold, items };
  };

  const run = (order: TradeOrder) => {
    if (!canExecute(tradeState(), order).ok) return;

    const store = useGameStore.getState();
    if (order.type === "buy") {
      if (!inventory.addItem(order.itemId, order.quantity)) return;
      eventBus.emit("gold:changed", {
        amount: -order.unitPrice * order.quantity,
        total: store.gold - order.unitPrice * order.quantity,
      });
    } else {
      inventory.removeItem(order.itemId, order.quantity);
      eventBus.emit("gold:changed", {
        amount: order.unitPrice * order.quantity,
        total: store.gold + order.unitPrice * order.quantity,
      });
    }
    syncInventory();
  };

  const onBuy = ({ itemId }: { itemId: string }) => {
    const price = getBuyPrice(port, itemId);
    if (price === null) return;
    run({ type: "buy", itemId, quantity: 1, unitPrice: price });
  };

  const onSell = ({ itemId }: { itemId: string }) => {
    const price = getSellPrice(port, itemId);
    if (price === null) return;
    run({ type: "sell", itemId, quantity: 1, unitPrice: price });
  };

  eventBus.on("trade:buy", onBuy);
  eventBus.on("trade:sell", onSell);
  return () => {
    eventBus.off("trade:buy", onBuy);
    eventBus.off("trade:sell", onSell);
  };
};
