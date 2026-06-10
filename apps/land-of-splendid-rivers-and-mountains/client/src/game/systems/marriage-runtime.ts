import type {
  NpcDefinition,
  Season,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import type { InventorySystem } from "./inventory";
import {
  acceptProposal,
  canProposeToNpc,
  finalizeWedding,
  WEDDING_RING_ITEM_ID,
  type MarriageState,
} from "./marriage";
import { detectTransitionEvents } from "./marriage-events";
import npcsData from "../data/npcs.json";

const npcs = npcsData as ReadonlyArray<NpcDefinition>;

const SEASONS: ReadonlyArray<Season> = ["spring", "summer", "autumn", "winter"];
const DAYS_PER_SEASON = 28;

/** 계절 순환과 무관한 절대 일수 (약혼→결혼식 대기 계산용) */
export const toAbsoluteDay = (
  day: number,
  season: Season,
  year: number,
): number =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season) * DAYS_PER_SEASON +
  day;

export const WEDDING_WAIT_DAYS = 3;

const storeMarriage = (): MarriageState => {
  const s = useGameStore.getState();
  return {
    status: s.marriageStatus,
    partnerId: s.marriagePartnerId,
    engagedAtDay: s.engagedAtDay,
    marriedAtDay: s.marriedAtDay,
  };
};

const applyMarriage = (state: MarriageState): void => {
  useGameStore
    .getState()
    .setMarriage(
      state.status,
      state.partnerId,
      state.engagedAtDay,
      state.marriedAtDay,
    );
};

/**
 * 결혼 런타임 (Ch.3): 청혼 수락 → 약혼, 약혼 N일 후 자정에 결혼식.
 * 반지는 씬 소유 InventorySystem에서 소비하므로 선물과 같은 씬 핸들러 패턴.
 * 반환된 cleanup을 씬 shutdown에서 호출할 것.
 */
export const setupMarriageHandler = (
  inventory: InventorySystem,
  syncInventory: () => void,
): (() => void) => {
  const onProposed = ({ npcId }: { npcId: string }) => {
    const s = useGameStore.getState();
    const prev = storeMarriage();
    const ctx = {
      state: prev,
      inventory: inventory.hasItem(WEDDING_RING_ITEM_ID)
        ? [WEDDING_RING_ITEM_ID]
        : [],
      npcs: npcs.map((n) => ({
        npcId: n.id,
        relation: s.npcRelations[n.id] ?? 0,
        isEligible: n.marriageable === true,
      })),
    };
    if (!canProposeToNpc(npcId, ctx).ok) return;

    const today = toAbsoluteDay(s.day, s.season, s.year);
    const next = acceptProposal(prev, npcId, today);
    inventory.removeItem(WEDDING_RING_ITEM_ID);
    applyMarriage(next);
    syncInventory();
    for (const ev of detectTransitionEvents(prev, next, today)) {
      eventBus.emit("marriage:event", {
        type: ev.type,
        partnerId: ev.partnerId,
        day: ev.dayOfEvent,
      });
    }
  };

  const onDayEnd = ({
    day,
    season,
    year,
  }: {
    day: number;
    season: Season;
    year: number;
  }) => {
    const prev = storeMarriage();
    if (prev.status !== "engaged" || prev.engagedAtDay === null) return;
    const today = toAbsoluteDay(day, season, year);
    if (today - prev.engagedAtDay < WEDDING_WAIT_DAYS) return;

    const next = finalizeWedding(prev, today);
    applyMarriage(next);
    for (const ev of detectTransitionEvents(prev, next, today)) {
      eventBus.emit("marriage:event", {
        type: ev.type,
        partnerId: ev.partnerId,
        day: ev.dayOfEvent,
      });
    }
  };

  eventBus.on("npc:proposed", onProposed);
  eventBus.on("time:dayEnd", onDayEnd);
  return () => {
    eventBus.off("npc:proposed", onProposed);
    eventBus.off("time:dayEnd", onDayEnd);
  };
};
