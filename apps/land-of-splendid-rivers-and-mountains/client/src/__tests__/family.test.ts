import { describe, it, expect } from "vitest";
import {
  MIN_DAYS_BETWEEN_CHILDREN,
  createFamilyState,
  addChild,
  getChildAgeInDays,
  canHaveAnotherChild,
  type Child,
  type FamilyState,
} from "../game/systems/family";

const child = (overrides: Partial<Child> = {}): Child => ({
  id: "child-a",
  name: "수아",
  birthDay: 100,
  ...overrides,
});

// Minimal shape of the marriage side relevant to canHaveAnotherChild.
const marriedState = { status: "married" as const };
const singleState = { status: "single" as const };
const engagedState = { status: "engaged" as const };

describe("family — constants", () => {
  it("exposes a non-trivial MIN_DAYS_BETWEEN_CHILDREN", () => {
    expect(MIN_DAYS_BETWEEN_CHILDREN).toBeGreaterThan(0);
    expect(MIN_DAYS_BETWEEN_CHILDREN).toBe(365);
  });
});

describe("createFamilyState", () => {
  it("returns an empty family", () => {
    const f = createFamilyState();
    expect(f.children).toEqual([]);
    expect(f.lastChildBornDay).toBeNull();
  });

  it("returns a fresh object each call", () => {
    expect(createFamilyState()).not.toBe(createFamilyState());
  });
});

describe("addChild", () => {
  it("appends a child and records the birthDay as lastChildBornDay", () => {
    const f = addChild(createFamilyState(), child({ birthDay: 200 }));
    expect(f.children.length).toBe(1);
    expect(f.children[0]!.id).toBe("child-a");
    expect(f.lastChildBornDay).toBe(200);
  });

  it("appends additional children preserving order", () => {
    const f1 = addChild(
      createFamilyState(),
      child({ id: "c1", birthDay: 100 }),
    );
    const f2 = addChild(f1, child({ id: "c2", birthDay: 500 }));
    expect(f2.children.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(f2.lastChildBornDay).toBe(500);
  });

  it("throws on duplicate id", () => {
    const f = addChild(createFamilyState(), child({ id: "c1" }));
    expect(() => addChild(f, child({ id: "c1" }))).toThrow();
  });

  it("does not mutate the input family", () => {
    const f = createFamilyState();
    const snapshot = structuredClone(f);
    addChild(f, child());
    expect(f).toEqual(snapshot);
  });

  it("does not mutate the input child object", () => {
    const c = child();
    const snapshot = structuredClone(c);
    addChild(createFamilyState(), c);
    expect(c).toEqual(snapshot);
  });
});

describe("getChildAgeInDays", () => {
  it("returns 0 on the birthday itself", () => {
    expect(getChildAgeInDays(child({ birthDay: 100 }), 100)).toBe(0);
  });

  it("returns positive age after birth", () => {
    expect(getChildAgeInDays(child({ birthDay: 100 }), 365)).toBe(265);
  });

  it("clamps to 0 for a day before the child's birth", () => {
    expect(getChildAgeInDays(child({ birthDay: 100 }), 50)).toBe(0);
  });
});

describe("canHaveAnotherChild", () => {
  it("returns ok=true when married, no prior children, any day", () => {
    const r = canHaveAnotherChild(
      marriedState,
      createFamilyState(),
      MIN_DAYS_BETWEEN_CHILDREN,
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags notMarried for single status", () => {
    const r = canHaveAnotherChild(singleState, createFamilyState(), 999);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("notMarried");
  });

  it("flags notMarried for engaged status (engagement alone is insufficient)", () => {
    const r = canHaveAnotherChild(engagedState, createFamilyState(), 999);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("notMarried");
  });

  it("flags cooldownActive when MIN_DAYS_BETWEEN_CHILDREN has not passed", () => {
    const family: FamilyState = {
      children: [child({ id: "c1", birthDay: 100 })],
      lastChildBornDay: 100,
    };
    const r = canHaveAnotherChild(
      marriedState,
      family,
      100 + MIN_DAYS_BETWEEN_CHILDREN - 1,
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("cooldownActive");
  });

  it("clears cooldown at exactly MIN_DAYS_BETWEEN_CHILDREN after last birth", () => {
    const family: FamilyState = {
      children: [child({ id: "c1", birthDay: 100 })],
      lastChildBornDay: 100,
    };
    const r = canHaveAnotherChild(
      marriedState,
      family,
      100 + MIN_DAYS_BETWEEN_CHILDREN,
    );
    expect(r.ok).toBe(true);
  });

  it("aggregates notMarried + cooldownActive when both apply", () => {
    const family: FamilyState = {
      children: [child({ id: "c1", birthDay: 100 })],
      lastChildBornDay: 100,
    };
    const r = canHaveAnotherChild(singleState, family, 150);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("notMarried");
    expect(r.reasons).toContain("cooldownActive");
  });

  it("does not mutate the input family", () => {
    const family: FamilyState = {
      children: [child({ id: "c1", birthDay: 100 })],
      lastChildBornDay: 100,
    };
    const snapshot = structuredClone(family);
    canHaveAnotherChild(marriedState, family, 500);
    expect(family).toEqual(snapshot);
  });
});
