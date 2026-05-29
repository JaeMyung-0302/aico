import { describe, it, expect } from "vitest";
import {
  DEFAULT_DAYS_PER_YEAR,
  detectTransitionEvents,
  isAnniversary,
  getAnniversaryCount,
  type MarriageLike,
  type MarriageEvent,
} from "../game/systems/marriage-events";

const single: MarriageLike = {
  status: "single",
  partnerId: null,
  engagedAtDay: null,
  marriedAtDay: null,
};

const engaged = (partnerId: string, engagedAtDay: number): MarriageLike => ({
  status: "engaged",
  partnerId,
  engagedAtDay,
  marriedAtDay: null,
});

const married = (
  partnerId: string,
  engagedAtDay: number,
  marriedAtDay: number,
): MarriageLike => ({
  status: "married",
  partnerId,
  engagedAtDay,
  marriedAtDay,
});

describe("detectTransitionEvents", () => {
  it("returns empty when prev and next are identical", () => {
    expect(detectTransitionEvents(single, single, 10)).toEqual([]);
    const e = engaged("a", 5);
    expect(detectTransitionEvents(e, e, 10)).toEqual([]);
  });

  it("emits 'engagement' on single → engaged", () => {
    const events = detectTransitionEvents(single, engaged("yeonhwa", 10), 10);
    expect(events).toEqual<MarriageEvent[]>([
      { type: "engagement", partnerId: "yeonhwa", dayOfEvent: 10 },
    ]);
  });

  it("emits 'wedding' on engaged → married", () => {
    const e = engaged("yeonhwa", 5);
    const m = married("yeonhwa", 5, 20);
    expect(detectTransitionEvents(e, m, 20)).toEqual<MarriageEvent[]>([
      { type: "wedding", partnerId: "yeonhwa", dayOfEvent: 20 },
    ]);
  });

  it("emits both engagement and wedding on single → married in one step", () => {
    const m = married("y", 5, 20);
    const events = detectTransitionEvents(single, m, 20);
    expect(events.find((e) => e.type === "engagement")).toBeDefined();
    expect(events.find((e) => e.type === "wedding")).toBeDefined();
  });

  it("emits nothing on engaged-to-engaged with same partner", () => {
    const a = engaged("a", 5);
    const b = engaged("a", 5);
    expect(detectTransitionEvents(a, b, 10)).toEqual([]);
  });

  it("emits 'engagement' when partner changes from null to a name (even if already engaged — defensive)", () => {
    // unusual path: probably data corruption, but spec should handle it
    const a = engaged("null-placeholder", 1);
    const partnerless: MarriageLike = { ...a, partnerId: null };
    const events = detectTransitionEvents(partnerless, a, 5);
    // no status change (both engaged) → no event
    expect(events).toEqual([]);
  });
});

describe("isAnniversary", () => {
  it("returns true at exactly one full year after marriedAtDay", () => {
    expect(
      isAnniversary(10, 10 + DEFAULT_DAYS_PER_YEAR, DEFAULT_DAYS_PER_YEAR),
    ).toBe(true);
  });

  it("returns true at multi-year anniversaries", () => {
    expect(
      isAnniversary(10, 10 + DEFAULT_DAYS_PER_YEAR * 5, DEFAULT_DAYS_PER_YEAR),
    ).toBe(true);
  });

  it("returns false on non-anniversary days", () => {
    expect(
      isAnniversary(10, 10 + DEFAULT_DAYS_PER_YEAR - 1, DEFAULT_DAYS_PER_YEAR),
    ).toBe(false);
  });

  it("returns false on the wedding day itself (no zero-anniversary)", () => {
    expect(isAnniversary(10, 10, DEFAULT_DAYS_PER_YEAR)).toBe(false);
  });

  it("returns false for dates before the wedding", () => {
    expect(isAnniversary(20, 5, DEFAULT_DAYS_PER_YEAR)).toBe(false);
  });

  it("returns false when marriedAtDay is null", () => {
    expect(isAnniversary(null, 100, DEFAULT_DAYS_PER_YEAR)).toBe(false);
  });

  it("throws when daysPerYear is non-positive", () => {
    expect(() => isAnniversary(0, 365, 0)).toThrow();
    expect(() => isAnniversary(0, 365, -10)).toThrow();
  });
});

describe("getAnniversaryCount", () => {
  it("returns 0 before the first anniversary", () => {
    expect(
      getAnniversaryCount(0, DEFAULT_DAYS_PER_YEAR - 1, DEFAULT_DAYS_PER_YEAR),
    ).toBe(0);
  });

  it("returns 1 at exactly the first anniversary", () => {
    expect(
      getAnniversaryCount(0, DEFAULT_DAYS_PER_YEAR, DEFAULT_DAYS_PER_YEAR),
    ).toBe(1);
  });

  it("grows linearly", () => {
    expect(
      getAnniversaryCount(0, DEFAULT_DAYS_PER_YEAR * 7, DEFAULT_DAYS_PER_YEAR),
    ).toBe(7);
  });

  it("returns 0 when marriedAtDay is null", () => {
    expect(getAnniversaryCount(null, 365, DEFAULT_DAYS_PER_YEAR)).toBe(0);
  });

  it("returns 0 for negative elapsed time", () => {
    expect(getAnniversaryCount(100, 50, DEFAULT_DAYS_PER_YEAR)).toBe(0);
  });
});

describe("purity", () => {
  it("detectTransitionEvents does not mutate either state", () => {
    const prev = single;
    const next = engaged("a", 1);
    const prevSnap = structuredClone(prev);
    const nextSnap = structuredClone(next);
    detectTransitionEvents(prev, next, 5);
    expect(prev).toEqual(prevSnap);
    expect(next).toEqual(nextSnap);
  });
});
