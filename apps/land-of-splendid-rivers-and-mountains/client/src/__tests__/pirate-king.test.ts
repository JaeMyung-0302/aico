import { describe, it, expect } from "vitest";
import {
  createInitialPirateState,
  tickPirateKing,
  PHASE_THRESHOLD_BLOODIED,
  PHASE_THRESHOLD_DESPERATE,
  CUTLASS_RANGE,
  CANNON_RANGE_MIN,
  COOLDOWN_MS,
  RALLY_COOLDOWN_MS,
  type PirateKingState,
  type PirateKingTickInput,
} from "../game/systems/pirate-king";

const input = (
  overrides: Partial<PirateKingTickInput> = {},
): PirateKingTickInput => ({
  hpRatio: 1,
  playerDistance: 250,
  deltaMs: 16,
  ...overrides,
});

describe("pirate-king — constants", () => {
  it("thresholds are in descending order and in (0,1)", () => {
    expect(PHASE_THRESHOLD_BLOODIED).toBe(0.5);
    expect(PHASE_THRESHOLD_DESPERATE).toBe(0.2);
    expect(PHASE_THRESHOLD_BLOODIED).toBeGreaterThan(PHASE_THRESHOLD_DESPERATE);
  });

  it("ranges are sensible and cannon > cutlass", () => {
    expect(CUTLASS_RANGE).toBeGreaterThan(0);
    expect(CANNON_RANGE_MIN).toBeGreaterThan(CUTLASS_RANGE);
  });

  it("cooldowns decrease with phase intensity", () => {
    expect(COOLDOWN_MS.fresh).toBeGreaterThan(COOLDOWN_MS.bloodied);
    expect(COOLDOWN_MS.bloodied).toBeGreaterThan(COOLDOWN_MS.desperate);
  });
});

describe("createInitialPirateState", () => {
  it("starts in fresh phase with no cooldown and rally untriggered", () => {
    const s = createInitialPirateState();
    expect(s.phase).toBe("fresh");
    expect(s.cooldownMs).toBe(0);
    expect(s.rallyTriggered).toBe(false);
    expect(s.actionCounter).toBe(0);
  });
});

describe("tickPirateKing — phase determination", () => {
  it("stays fresh above PHASE_THRESHOLD_BLOODIED", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 0.8, playerDistance: 50 }),
    );
    expect(r.state.phase).toBe("fresh");
  });

  it("enters bloodied at exact PHASE_THRESHOLD_BLOODIED", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 0.5, playerDistance: 50 }),
    );
    expect(r.state.phase).toBe("bloodied");
  });

  it("enters desperate at exact PHASE_THRESHOLD_DESPERATE", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 0.2, playerDistance: 50 }),
    );
    expect(r.state.phase).toBe("desperate");
  });

  it("clamps hpRatio above 1 to fresh phase", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 2.5, playerDistance: 50 }),
    );
    expect(r.state.phase).toBe("fresh");
  });

  it("clamps negative hpRatio to desperate phase", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: -1, playerDistance: 50 }),
    );
    expect(r.state.phase).toBe("desperate");
  });
});

describe("tickPirateKing — action selection (no cooldown)", () => {
  it("picks cutlass_swing in close range", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ playerDistance: 50 }),
    );
    expect(r.action).toBe("cutlass_swing");
  });

  it("picks cannon_broadside at long range", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ playerDistance: 500 }),
    );
    expect(r.action).toBe("cannon_broadside");
  });

  it("picks pistol_shot at mid range", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ playerDistance: 250 }),
    );
    expect(r.action).toBe("pistol_shot");
  });
});

describe("tickPirateKing — rally", () => {
  it("fires rally on first entry to desperate", () => {
    const r = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(r.action).toBe("rally");
    expect(r.state.rallyTriggered).toBe(true);
    expect(r.state.cooldownMs).toBe(RALLY_COOLDOWN_MS);
  });

  it("does not fire rally a second time after hp oscillates", () => {
    const firstDrop = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(firstDrop.action).toBe("rally");

    const healed = tickPirateKing(
      firstDrop.state,
      input({ hpRatio: 0.9, playerDistance: 50, deltaMs: 5000 }),
    );
    expect(healed.state.rallyTriggered).toBe(true);

    const secondDrop = tickPirateKing(
      healed.state,
      input({ hpRatio: 0.05, playerDistance: 50, deltaMs: 5000 }),
    );
    expect(secondDrop.action).not.toBe("rally");
  });

  it("rally overrides an existing cooldown", () => {
    const midCooldown: PirateKingState = {
      phase: "bloodied",
      cooldownMs: 800,
      rallyTriggered: false,
      actionCounter: 3,
    };
    const r = tickPirateKing(
      midCooldown,
      input({ hpRatio: 0.1, playerDistance: 50, deltaMs: 16 }),
    );
    expect(r.action).toBe("rally");
    expect(r.state.cooldownMs).toBe(RALLY_COOLDOWN_MS);
  });
});

describe("tickPirateKing — cooldown", () => {
  it("returns idle while cooldown is active", () => {
    const state: PirateKingState = {
      phase: "fresh",
      cooldownMs: 500,
      rallyTriggered: false,
      actionCounter: 2,
    };
    const r = tickPirateKing(state, input({ deltaMs: 100, hpRatio: 1 }));
    expect(r.action).toBe("idle");
    expect(r.state.cooldownMs).toBe(400);
    expect(r.state.actionCounter).toBe(2);
  });

  it("clamps cooldown at zero (never negative)", () => {
    const state: PirateKingState = {
      phase: "fresh",
      cooldownMs: 50,
      rallyTriggered: false,
      actionCounter: 0,
    };
    const r = tickPirateKing(state, input({ deltaMs: 200 }));
    expect(r.state.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it("sets cooldown according to phase on non-idle action", () => {
    const freshHit = tickPirateKing(
      createInitialPirateState(),
      input({ hpRatio: 1, playerDistance: 50 }),
    );
    expect(freshHit.state.cooldownMs).toBe(COOLDOWN_MS.fresh);

    const bloodiedState: PirateKingState = {
      phase: "fresh",
      cooldownMs: 0,
      rallyTriggered: false,
      actionCounter: 0,
    };
    const bloodiedHit = tickPirateKing(
      bloodiedState,
      input({ hpRatio: 0.4, playerDistance: 50 }),
    );
    expect(bloodiedHit.state.cooldownMs).toBe(COOLDOWN_MS.bloodied);

    const desperateState: PirateKingState = {
      phase: "desperate",
      cooldownMs: 0,
      rallyTriggered: true,
      actionCounter: 0,
    };
    const desperateHit = tickPirateKing(
      desperateState,
      input({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(desperateHit.state.cooldownMs).toBe(COOLDOWN_MS.desperate);
  });
});

describe("tickPirateKing — purity", () => {
  it("does not mutate input state", () => {
    const state = createInitialPirateState();
    const snapshot = structuredClone(state);
    tickPirateKing(state, input());
    expect(state).toEqual(snapshot);
  });
});
