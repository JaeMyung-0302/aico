import { eventBus } from "./event-bus";
import { useGameStore } from "@/stores/useGameStore";
import { addChild, canHaveAnotherChild } from "@/game/systems/family";
import { toAbsoluteDay } from "@/game/systems/marriage-runtime";

/** 자녀 이름 순환 풀 — 출생 시점에 확정되어 세이브에 저장됨 */
const CHILD_NAMES = ["하늘", "두리", "보람", "슬기"] as const;

let cleanup: (() => void) | null = null;

const onRequestChild = ({ partnerId }: { partnerId: string }): void => {
  const s = useGameStore.getState();
  if (s.marriagePartnerId !== partnerId) return;

  const family = {
    children: s.familyChildren,
    lastChildBornDay: s.lastChildBornDay,
  };
  const today = toAbsoluteDay(s.day, s.season, s.year);
  const check = canHaveAnotherChild(
    { status: s.marriageStatus },
    family,
    today,
  );
  if (!check.ok) return;

  const child = {
    id: `child-${s.familyChildren.length + 1}`,
    name: CHILD_NAMES[s.familyChildren.length % CHILD_NAMES.length] ?? "하늘",
    birthDay: today,
  };
  const next = addChild(family, child);
  s.setFamily(next.children, next.lastChildBornDay);
  eventBus.emit("family:childBorn", {
    childId: child.id,
    name: child.name,
    birthDay: child.birthDay,
  });
};

/** 가족(자녀) 글로벌 브리지 (Ch.3 결혼 후속) — store-bridge와 동일 라이프사이클 */
export const initFamilyBridge = (): void => {
  if (cleanup) return;
  eventBus.on("family:requestChild", onRequestChild);
  cleanup = () => {
    eventBus.off("family:requestChild", onRequestChild);
    cleanup = null;
  };
};

export const destroyFamilyBridge = (): void => {
  cleanup?.();
};
