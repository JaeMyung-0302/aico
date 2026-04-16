import { describe, it, expect } from "vitest";
import {
  NPC_SCHEDULE,
  TIME_SLOT_BOUNDARIES,
  resolveTimeSlot,
  getScheduleEntry,
  getNPCsAt,
  type Season,
  type TimeSlot,
} from "../game/systems/npc-schedule";

const allSeasons: ReadonlyArray<Season> = [
  "spring",
  "summer",
  "autumn",
  "winter",
];
const allSlots: ReadonlyArray<TimeSlot> = [
  "dawn",
  "morning",
  "noon",
  "evening",
  "night",
];

describe("TIME_SLOT_BOUNDARIES", () => {
  it("covers the full 1440-minute day in ascending order", () => {
    expect(TIME_SLOT_BOUNDARIES.length).toBe(allSlots.length);
    for (let i = 1; i < TIME_SLOT_BOUNDARIES.length; i++) {
      expect(TIME_SLOT_BOUNDARIES[i]!.startMinute).toBeGreaterThan(
        TIME_SLOT_BOUNDARIES[i - 1]!.startMinute,
      );
    }
    expect(TIME_SLOT_BOUNDARIES[0]!.startMinute).toBeGreaterThanOrEqual(0);
    expect(
      TIME_SLOT_BOUNDARIES[TIME_SLOT_BOUNDARIES.length - 1]!.startMinute,
    ).toBeLessThan(1440);
  });
});

describe("resolveTimeSlot", () => {
  it("returns 'dawn' at time-of-day 5:00 (300 min)", () => {
    expect(resolveTimeSlot(300)).toBe("dawn");
  });

  it("returns 'morning' at 8:00 (480 min)", () => {
    expect(resolveTimeSlot(480)).toBe("morning");
  });

  it("returns 'noon' at 12:00 (720 min)", () => {
    expect(resolveTimeSlot(720)).toBe("noon");
  });

  it("returns 'evening' at 18:00 (1080 min)", () => {
    expect(resolveTimeSlot(1080)).toBe("evening");
  });

  it("returns 'night' at 22:00 (1320 min)", () => {
    expect(resolveTimeSlot(1320)).toBe("night");
  });

  it("wraps to the last-slot of the day for times before first boundary", () => {
    // Before dawn = late night carry-over
    expect(resolveTimeSlot(0)).toBe("night");
    expect(resolveTimeSlot(100)).toBe("night");
  });

  it("clamps negative input to the pre-dawn carry-over slot", () => {
    expect(resolveTimeSlot(-50)).toBe("night");
  });

  it("modulates times beyond 1440 back into the day", () => {
    expect(resolveTimeSlot(1440 + 480)).toBe("morning");
  });
});

describe("NPC_SCHEDULE", () => {
  it("contains at least one row per season", () => {
    for (const s of allSeasons) {
      const rows = NPC_SCHEDULE.filter((e) => e.season === s);
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it("every row has a non-empty npcId and location", () => {
    for (const row of NPC_SCHEDULE) {
      expect(row.npcId.length).toBeGreaterThan(0);
      expect(row.location.length).toBeGreaterThan(0);
    }
  });

  it("no duplicate (npcId, season, timeSlot) tuples", () => {
    const keys = new Set<string>();
    for (const row of NPC_SCHEDULE) {
      const key = `${row.npcId}:${row.season}:${row.timeSlot}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });
});

describe("getScheduleEntry", () => {
  it("returns a matching entry when one exists", () => {
    const first = NPC_SCHEDULE[0]!;
    expect(getScheduleEntry(first.npcId, first.season, first.timeSlot)).toEqual(
      first,
    );
  });

  it("returns null for an unknown triple", () => {
    expect(getScheduleEntry("nonexistent", "spring", "dawn")).toBeNull();
  });
});

describe("getNPCsAt", () => {
  it("returns the ids of all NPCs scheduled at a location at a given time", () => {
    // Find a location/season/timeSlot that exists in the table
    const row = NPC_SCHEDULE[0]!;
    const ids = getNPCsAt(row.location, row.season, row.timeSlot);
    expect(ids).toContain(row.npcId);
  });

  it("returns an empty list for a location with no matching entries", () => {
    expect(getNPCsAt("nowhere", "spring", "dawn")).toEqual([]);
  });
});

describe("purity", () => {
  it("NPC_SCHEDULE is not mutated by operations", () => {
    const snapshot = JSON.stringify(NPC_SCHEDULE);
    resolveTimeSlot(600);
    getScheduleEntry("anyone", "spring", "dawn");
    getNPCsAt("anywhere", "winter", "night");
    expect(JSON.stringify(NPC_SCHEDULE)).toBe(snapshot);
  });
});
