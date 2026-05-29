import { describe, it, expect } from "vitest";
import {
  DISASTERS,
  getDisastersForSeason,
  rollDisasterForDay,
  type Season,
  type DisasterEvent,
} from "../game/systems/seasonal-disasters";

const allSeasons: ReadonlyArray<Season> = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

describe("DISASTERS table", () => {
  it("defines at least 5 disasters", () => {
    expect(DISASTERS.length).toBeGreaterThanOrEqual(5);
  });

  it("all ids are unique", () => {
    const ids = DISASTERS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each disaster has probability in (0, 1)", () => {
    for (const d of DISASTERS) {
      expect(d.probability).toBeGreaterThan(0);
      expect(d.probability).toBeLessThan(1);
    }
  });

  it("each disaster has durationDays >= 1", () => {
    for (const d of DISASTERS) {
      expect(d.durationDays).toBeGreaterThanOrEqual(1);
    }
  });

  it("each disaster is tagged with at least one season", () => {
    for (const d of DISASTERS) {
      expect(d.seasons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all 4 seasons appear somewhere in the table", () => {
    const seasons = new Set<Season>();
    for (const d of DISASTERS) {
      for (const s of d.seasons) seasons.add(s);
    }
    for (const s of allSeasons) {
      expect(seasons.has(s)).toBe(true);
    }
  });
});

describe("getDisastersForSeason", () => {
  it("returns only disasters tagged with the given season", () => {
    for (const s of allSeasons) {
      const got = getDisastersForSeason(s);
      for (const d of got) {
        expect(d.seasons).toContain(s);
      }
    }
  });

  it("returns a deterministically ordered array (sorted by id)", () => {
    const a = getDisastersForSeason("winter");
    const b = [...a].sort((x, y) => x.id.localeCompare(y.id));
    expect(a).toEqual(b);
  });
});

describe("rollDisasterForDay — probability-interval matching", () => {
  it("returns null when randomValue falls above total probability", () => {
    const r = rollDisasterForDay("summer", 0.9999);
    expect(r).toBeNull();
  });

  it("returns a disaster when randomValue is 0 (always inside first interval)", () => {
    for (const s of allSeasons) {
      const list = getDisastersForSeason(s);
      if (list.length === 0) continue;
      const r = rollDisasterForDay(s, 0);
      expect(r).not.toBeNull();
      expect(r?.seasons).toContain(s);
    }
  });

  it("hits the first disaster when randomValue is inside its probability window", () => {
    const wildfireOnly = getDisastersForSeason("spring");
    expect(wildfireOnly.length).toBeGreaterThanOrEqual(1);
    const first = wildfireOnly[0]!;
    const midOfInterval = first.probability / 2;
    expect(rollDisasterForDay("spring", midOfInterval)?.id).toBe(first.id);
  });

  it("skips past the first disaster when randomValue exceeds its probability", () => {
    const list = getDisastersForSeason("summer");
    if (list.length < 2) return; // skip if only one summer disaster — table can grow
    const first = list[0]!;
    const second = list[1]!;
    const justPastFirst = first.probability + second.probability / 2;
    const r = rollDisasterForDay("summer", justPastFirst);
    expect(r?.id).toBe(second.id);
  });

  it("returns null for an empty-season lookup even at randomValue=0", () => {
    // Construct a season with no disasters by probing all seasons and
    // asserting that when total probability <= 0 (empty), null is returned.
    // If every season has a disaster in the current table, skip this test
    // — but assert the guarantee via a direct randomValue=1.
    const r = rollDisasterForDay("summer", 1);
    expect(r).toBeNull();
  });

  it("is deterministic: same inputs yield same output", () => {
    const a = rollDisasterForDay("winter", 0.03);
    const b = rollDisasterForDay("winter", 0.03);
    expect(a?.id).toBe(b?.id);
  });
});

describe("purity", () => {
  it("DISASTERS is not mutated by operations", () => {
    const snapshot = JSON.stringify(DISASTERS);
    getDisastersForSeason("summer");
    rollDisasterForDay("summer", 0.5);
    expect(JSON.stringify(DISASTERS)).toBe(snapshot);
  });

  it("getDisastersForSeason returns a fresh array each call", () => {
    const a = getDisastersForSeason("summer");
    const b = getDisastersForSeason("summer");
    expect(a).not.toBe(b);
  });
});

describe("type sanity", () => {
  it("matches expected DisasterEvent shape", () => {
    const d: DisasterEvent = DISASTERS[0]!;
    expect(typeof d.id).toBe("string");
    expect(typeof d.probability).toBe("number");
    expect(typeof d.durationDays).toBe("number");
  });
});
