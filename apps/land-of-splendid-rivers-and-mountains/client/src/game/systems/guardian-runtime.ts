import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { InventorySystem } from "./inventory";
import { canSummonGuardian, GUARDIANS, type GuardianId } from "./guardian";
import { GUARDIAN_BONUSES } from "./guardian-bonuses";

const isGuardianId = (id: string): id is GuardianId =>
  id === "spring" || id === "summer" || id === "autumn" || id === "winter";

/**
 * 수호신 소환 런타임 (Ch.5): 사찰에서 부적을 바쳐 소환 — 조건(연차/평판/
 * 부적/보스) 충족 시 부적 소비 + 영구 스탯 보너스(store 가산, 세이브 영속).
 * TempleScene에서만 등록. 반환된 cleanup을 shutdown에서 호출할 것.
 */
export const setupGuardianHandler = (
  inventory: InventorySystem,
  syncInventory: () => void,
): (() => void) => {
  const onSummon = ({ guardianId }: { guardianId: string }) => {
    if (!isGuardianId(guardianId)) return;
    const s = useGameStore.getState();
    if (s.summonedGuardians.includes(guardianId)) return;

    const def = GUARDIANS[guardianId];
    const itemIds = inventory
      .getSlots()
      .filter((slot) => slot !== null)
      .map((slot) => slot.itemId);
    const check = canSummonGuardian(def, {
      year: s.year,
      reputation: s.reputation,
      inventory: itemIds,
      defeatedBosses: [], // 보스 처치 추적은 후속 통합(이무기) 시 연결
    });
    if (!check.canSummon) return;

    if (def.requirements.requiredItemId) {
      inventory.removeItem(def.requirements.requiredItemId);
    }
    const bonus = GUARDIAN_BONUSES[guardianId];
    s.setPlayerHp(
      s.playerHp + bonus.hpBonus,
      s.playerMaxHp + bonus.hpBonus,
      s.playerAttack + bonus.attackBonus,
      s.playerDefense + bonus.defenseBonus,
    );
    s.setSummonedGuardians([...s.summonedGuardians, guardianId]);
    syncInventory();
    eventBus.emit("guardian:summoned", { guardianId });
  };

  eventBus.on("guardian:summon", onSummon);
  return () => {
    eventBus.off("guardian:summon", onSummon);
  };
};
