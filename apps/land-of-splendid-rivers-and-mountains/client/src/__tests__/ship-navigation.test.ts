import { describe, it, expect } from "vitest";
import {
  LANE_HALF_WIDTH,
  HAZARD_RADIUS,
  MAX_DAMAGE,
  STEER_SPEED_PER_MS,
  DISTANCE_SPEED_PER_MS,
  DAMAGE_PER_COLLISION_MS,
  createInitialNavigationState,
  tickNavigation,
  type NavigationState,
  type NavigationTickInput,
} from "../game/systems/ship-navigation";

const input = (
  overrides: Partial<NavigationTickInput> = {},
): NavigationTickInput => ({
  deltaMs: 16,
  playerSteer: 0,
  hazardY: null,
  ...overrides,
});

describe("ship-navigation — constants", () => {
  it("all tuning constants are positive", () => {
    expect(LANE_HALF_WIDTH).toBeGreaterThan(0);
    expect(HAZARD_RADIUS).toBeGreaterThan(0);
    expect(MAX_DAMAGE).toBeGreaterThan(0);
    expect(STEER_SPEED_PER_MS).toBeGreaterThan(0);
    expect(DISTANCE_SPEED_PER_MS).toBeGreaterThan(0);
    expect(DAMAGE_PER_COLLISION_MS).toBeGreaterThan(0);
  });
});

describe("createInitialNavigationState", () => {
  it("returns in_progress with zero offsets and damage", () => {
    const s = createInitialNavigationState(1000);
    expect(s.outcome).toBe("in_progress");
    expect(s.positionY).toBe(0);
    expect(s.damage).toBe(0);
    expect(s.distanceRemaining).toBe(1000);
  });

  it("returns a fresh object each call", () => {
    expect(createInitialNavigationState(500)).not.toBe(
      createInitialNavigationState(500),
    );
  });

  it("throws on non-positive distance", () => {
    expect(() => createInitialNavigationState(0)).toThrow();
    expect(() => createInitialNavigationState(-10)).toThrow();
  });
});

describe("tickNavigation — distance and motion", () => {
  it("decreases distanceRemaining by DISTANCE_SPEED_PER_MS * deltaMs", () => {
    const s0 = createInitialNavigationState(1000);
    const s1 = tickNavigation(s0, input({ deltaMs: 100 }));
    expect(s1.distanceRemaining).toBe(1000 - DISTANCE_SPEED_PER_MS * 100);
  });

  it("moves positionY left on steer = -1", () => {
    const s = tickNavigation(
      createInitialNavigationState(1000),
      input({ playerSteer: -1, deltaMs: 100 }),
    );
    expect(s.positionY).toBeLessThan(0);
    expect(s.positionY).toBeCloseTo(-STEER_SPEED_PER_MS * 100, 5);
  });

  it("moves positionY right on steer = +1", () => {
    const s = tickNavigation(
      createInitialNavigationState(1000),
      input({ playerSteer: 1, deltaMs: 100 }),
    );
    expect(s.positionY).toBeGreaterThan(0);
  });

  it("clamps positionY at +LANE_HALF_WIDTH", () => {
    const s0: NavigationState = {
      positionY: LANE_HALF_WIDTH - 0.1,
      distanceRemaining: 1000,
      damage: 0,
      outcome: "in_progress",
    };
    const s1 = tickNavigation(s0, input({ playerSteer: 1, deltaMs: 10000 }));
    expect(s1.positionY).toBe(LANE_HALF_WIDTH);
  });

  it("clamps positionY at -LANE_HALF_WIDTH", () => {
    const s0: NavigationState = {
      positionY: -(LANE_HALF_WIDTH - 0.1),
      distanceRemaining: 1000,
      damage: 0,
      outcome: "in_progress",
    };
    const s1 = tickNavigation(s0, input({ playerSteer: -1, deltaMs: 10000 }));
    expect(s1.positionY).toBe(-LANE_HALF_WIDTH);
  });
});

describe("tickNavigation — hazards", () => {
  it("increases damage when positionY is within HAZARD_RADIUS of hazardY", () => {
    const s0 = createInitialNavigationState(1000);
    const s1 = tickNavigation(s0, input({ hazardY: 0, deltaMs: 100 }));
    expect(s1.damage).toBeGreaterThan(0);
    expect(s1.damage).toBeCloseTo(DAMAGE_PER_COLLISION_MS * 100, 5);
  });

  it("does not increase damage when hazard is beyond HAZARD_RADIUS", () => {
    const s0: NavigationState = {
      positionY: 0,
      distanceRemaining: 1000,
      damage: 0,
      outcome: "in_progress",
    };
    const s1 = tickNavigation(
      s0,
      input({ hazardY: LANE_HALF_WIDTH, deltaMs: 100 }),
    );
    expect(s1.damage).toBe(0);
  });

  it("no damage when hazardY is null", () => {
    const s = tickNavigation(
      createInitialNavigationState(1000),
      input({ hazardY: null }),
    );
    expect(s.damage).toBe(0);
  });
});

describe("tickNavigation — outcome transitions", () => {
  it("outcome becomes success when distanceRemaining drops to <= 0", () => {
    const s0 = createInitialNavigationState(10);
    const s1 = tickNavigation(s0, input({ deltaMs: 10_000 }));
    expect(s1.outcome).toBe("success");
    expect(s1.distanceRemaining).toBeLessThanOrEqual(0);
  });

  it("outcome becomes failed when damage accumulates to MAX_DAMAGE", () => {
    const s0 = createInitialNavigationState(999999);
    let s = s0;
    let ticks = 0;
    while (s.outcome === "in_progress" && ticks < 1000) {
      s = tickNavigation(s, input({ hazardY: 0, deltaMs: 1000 }));
      ticks++;
    }
    expect(s.outcome).toBe("failed");
    expect(s.damage).toBeGreaterThanOrEqual(MAX_DAMAGE);
  });

  it("terminal state is sticky — further ticks do not change outcome", () => {
    const won: NavigationState = {
      positionY: 0,
      distanceRemaining: 0,
      damage: 0,
      outcome: "success",
    };
    const next = tickNavigation(won, input({ playerSteer: 1 }));
    expect(next).toEqual(won);

    const lost: NavigationState = {
      positionY: 0,
      distanceRemaining: 500,
      damage: MAX_DAMAGE,
      outcome: "failed",
    };
    const next2 = tickNavigation(lost, input({ playerSteer: 1 }));
    expect(next2).toEqual(lost);
  });
});

describe("tickNavigation — input validation", () => {
  it("throws on deltaMs < 0", () => {
    expect(() =>
      tickNavigation(createInitialNavigationState(100), input({ deltaMs: -1 })),
    ).toThrow();
  });

  it("deltaMs = 0 is a no-op", () => {
    const s0 = createInitialNavigationState(100);
    const s1 = tickNavigation(s0, input({ deltaMs: 0, playerSteer: 1 }));
    expect(s1).toEqual(s0);
  });
});

describe("purity", () => {
  it("tickNavigation does not mutate input state", () => {
    const s0 = createInitialNavigationState(500);
    const snapshot = structuredClone(s0);
    tickNavigation(s0, input({ playerSteer: 1, deltaMs: 100 }));
    expect(s0).toEqual(snapshot);
  });
});
