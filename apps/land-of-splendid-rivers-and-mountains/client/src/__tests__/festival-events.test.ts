import { describe, it, expect } from "vitest";
import {
  FESTIVALS,
  getActiveFestival,
  getUpcomingFestival,
  type Season,
  type FestivalEvent,
} from "../game/systems/festival-events";

const allSeasons: ReadonlyArray<Season> = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

describe("FESTIVALS table", () => {
  it("defines exactly 4 festivals — one per season", () => {
    expect(FESTIVALS.length).toBe(4);
    const seasons = FESTIVALS.map((f) => f.season);
    expect(new Set(seasons)).toEqual(new Set(allSeasons));
  });

  it("each festival has positive duration and dayOfSeason within [1, 28]", () => {
    for (const f of FESTIVALS) {
      expect(f.durationDays).toBeGreaterThan(0);
      expect(f.dayOfSeason).toBeGreaterThanOrEqual(1);
      expect(f.dayOfSeason).toBeLessThanOrEqual(28);
    }
  });

  it("each festival id is unique", () => {
    const ids = FESTIVALS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each nameKey is non-empty", () => {
    for (const f of FESTIVALS) {
      expect(f.nameKey.length).toBeGreaterThan(0);
    }
  });
});

describe("getActiveFestival", () => {
  const cherry = FESTIVALS.find((f) => f.season === "spring")!;

  it("returns the festival on the start day", () => {
    const r = getActiveFestival("spring", cherry.dayOfSeason);
    expect(r?.id).toBe(cherry.id);
  });

  it("returns the festival on the last day of its run", () => {
    const lastDay = cherry.dayOfSeason + cherry.durationDays - 1;
    const r = getActiveFestival("spring", lastDay);
    expect(r?.id).toBe(cherry.id);
  });

  it("returns null one day before the festival starts", () => {
    expect(getActiveFestival("spring", cherry.dayOfSeason - 1)).toBeNull();
  });

  it("returns null one day after the festival ends", () => {
    const dayAfter = cherry.dayOfSeason + cherry.durationDays;
    expect(getActiveFestival("spring", dayAfter)).toBeNull();
  });

  it("returns null when the season does not match the festival's season", () => {
    expect(getActiveFestival("winter", cherry.dayOfSeason)).toBeNull();
  });
});

describe("getUpcomingFestival", () => {
  it("returns null when the season's festival has already ended", () => {
    const cherry = FESTIVALS.find((f) => f.season === "spring")!;
    const dayAfter = cherry.dayOfSeason + cherry.durationDays;
    expect(getUpcomingFestival("spring", dayAfter)).toBeNull();
  });

  it("returns the festival with daysUntil=0 if it is currently active", () => {
    const cherry = FESTIVALS.find((f) => f.season === "spring")!;
    const r = getUpcomingFestival("spring", cherry.dayOfSeason);
    expect(r).not.toBeNull();
    expect(r?.festival.id).toBe(cherry.id);
    expect(r?.daysUntil).toBe(0);
  });

  it("returns positive daysUntil for an upcoming festival", () => {
    const cherry = FESTIVALS.find((f) => f.season === "spring")!;
    const r = getUpcomingFestival("spring", 1);
    expect(r?.festival.id).toBe(cherry.id);
    expect(r?.daysUntil).toBe(cherry.dayOfSeason - 1);
  });
});

describe("purity", () => {
  it("getActiveFestival does not mutate the FESTIVALS table", () => {
    const snapshot = JSON.stringify(FESTIVALS);
    getActiveFestival("spring", 5);
    expect(JSON.stringify(FESTIVALS)).toBe(snapshot);
  });
});

describe("type sanity", () => {
  it("matches expected FestivalEvent shape", () => {
    // Compile-time helper: assigning will fail to type-check if the shape drifts.
    const f: FestivalEvent = FESTIVALS[0]!;
    expect(typeof f.id).toBe("string");
    expect(typeof f.dayOfSeason).toBe("number");
    expect(typeof f.durationDays).toBe("number");
  });
});
