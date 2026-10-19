import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { InventorySystem } from "./inventory";

/**
 * 씬 공용 이벤트/퀘스트 보상 수령 핸들러.
 * 퀘스트 자동완료와 계절 이벤트는 어느 씬에서나 발생하므로,
 * InventorySystem을 가진 씬은 반드시 이 핸들러를 등록해야
 * 보상 아이템이 유실되지 않는다 (골드는 store-bridge가 전역 처리).
 * 반환된 cleanup 함수를 씬 shutdown에서 호출할 것.
 */
export const setupRewardHandler = (
  inventory: InventorySystem,
  syncInventory: () => void,
): (() => void) => {
  const onEventReward = ({
    goldReward,
    items,
  }: {
    eventId: string;
    goldReward: number;
    items: ReadonlyArray<{ itemId: string; quantity: number }>;
  }) => {
    if (goldReward > 0) {
      const store = useGameStore.getState();
      eventBus.emit("gold:changed", {
        amount: goldReward,
        total: store.gold + goldReward,
      });
    }
    for (const item of items) {
      inventory.addItem(item.itemId, item.quantity);
    }
    syncInventory();
  };

  eventBus.on("event:reward", onEventReward);
  return () => {
    eventBus.off("event:reward", onEventReward);
  };
};
