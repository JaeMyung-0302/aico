export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimeSlot = "dawn" | "morning" | "noon" | "evening" | "night";

export interface TimeSlotBoundary {
  readonly slot: TimeSlot;
  readonly startMinute: number;
}

export interface ScheduleEntry {
  readonly npcId: string;
  readonly season: Season;
  readonly timeSlot: TimeSlot;
  readonly location: string;
  readonly activityKey?: string;
}

// Day clock: 0-1439 minutes. Slots wrap: anything before dawn carries the
// previous night's slot (so the game's "pre-dawn" visuals use night NPCs).
export const TIME_SLOT_BOUNDARIES: ReadonlyArray<TimeSlotBoundary> = [
  { slot: "dawn", startMinute: 300 },
  { slot: "morning", startMinute: 420 },
  { slot: "noon", startMinute: 660 },
  { slot: "evening", startMinute: 1020 },
  { slot: "night", startMinute: 1260 },
];

const MINUTES_PER_DAY = 1440;

export const resolveTimeSlot = (timeOfDay: number): TimeSlot => {
  // Wrap negative or out-of-range values into [0, MINUTES_PER_DAY).
  const normalized =
    ((timeOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  // Last boundary whose startMinute is <= normalized time wins.
  // If no boundary matches (normalized < first boundary), we carry over
  // the last slot (night) from the previous day.
  let current: TimeSlot =
    TIME_SLOT_BOUNDARIES[TIME_SLOT_BOUNDARIES.length - 1]!.slot;
  for (const boundary of TIME_SLOT_BOUNDARIES) {
    if (normalized >= boundary.startMinute) {
      current = boundary.slot;
    }
  }
  return current;
};

// Schedule entries — at least one row per season to exercise Ch.2's
// seasonal NPC rotation. Actual NPC ids placeholder until integration.
export const NPC_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
  // Spring
  {
    npcId: "grandfather",
    season: "spring",
    timeSlot: "morning",
    location: "village",
    activityKey: "npc.activity.tending-garden",
  },
  {
    npcId: "grandfather",
    season: "spring",
    timeSlot: "evening",
    location: "house",
    activityKey: "npc.activity.resting",
  },
  {
    npcId: "merchant",
    season: "spring",
    timeSlot: "morning",
    location: "market",
    activityKey: "npc.activity.trading",
  },
  {
    npcId: "merchant",
    season: "spring",
    timeSlot: "night",
    location: "tavern",
    activityKey: "npc.activity.drinking",
  },

  // Summer
  {
    npcId: "grandfather",
    season: "summer",
    timeSlot: "dawn",
    location: "farm",
    activityKey: "npc.activity.watering",
  },
  {
    npcId: "grandfather",
    season: "summer",
    timeSlot: "noon",
    location: "house",
    activityKey: "npc.activity.hiding-heat",
  },
  {
    npcId: "merchant",
    season: "summer",
    timeSlot: "evening",
    location: "beach",
    activityKey: "npc.activity.strolling",
  },

  // Autumn
  {
    npcId: "grandfather",
    season: "autumn",
    timeSlot: "morning",
    location: "farm",
    activityKey: "npc.activity.harvesting",
  },
  {
    npcId: "grandfather",
    season: "autumn",
    timeSlot: "evening",
    location: "temple",
    activityKey: "npc.activity.praying",
  },
  {
    npcId: "merchant",
    season: "autumn",
    timeSlot: "noon",
    location: "market",
    activityKey: "npc.activity.busy-trading",
  },

  // Winter
  {
    npcId: "grandfather",
    season: "winter",
    timeSlot: "morning",
    location: "house",
    activityKey: "npc.activity.tea",
  },
  {
    npcId: "grandfather",
    season: "winter",
    timeSlot: "night",
    location: "house",
    activityKey: "npc.activity.sleeping",
  },
  {
    npcId: "merchant",
    season: "winter",
    timeSlot: "noon",
    location: "market",
    activityKey: "npc.activity.trading-slow",
  },
];

export const getScheduleEntry = (
  npcId: string,
  season: Season,
  timeSlot: TimeSlot,
): ScheduleEntry | null =>
  NPC_SCHEDULE.find(
    (e) => e.npcId === npcId && e.season === season && e.timeSlot === timeSlot,
  ) ?? null;

export const getNPCsAt = (
  location: string,
  season: Season,
  timeSlot: TimeSlot,
): ReadonlyArray<string> =>
  NPC_SCHEDULE.filter(
    (e) =>
      e.location === location && e.season === season && e.timeSlot === timeSlot,
  ).map((e) => e.npcId);
