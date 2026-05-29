import { describe, it, expect } from "vitest";
import {
  createInitialState,
  tickImoogi,
  PHASE_THRESHOLD_AWAKENED,
  PHASE_THRESHOLD_ENRAGED,
  MELEE_RANGE,
  BREATH_RANGE,
  COOLDOWN_MS,
  ENRAGE_ROAR_COOLDOWN_MS,
  type ImoogiState,
  type ImoogiTickInput,
} from "../game/systems/imoogi-boss";

const makeInput = (
  overrides: Partial<ImoogiTickInput> = {},
): ImoogiTickInput => ({
  hpRatio: 1,
  playerDistance: 250,
  deltaMs: 16,
  ...overrides,
});

describe("imoogi-boss constants", () => {
  it("exposes documented phase thresholds and ranges", () => {
    expect(PHASE_THRESHOLD_AWAKENED).toBe(0.66);
    expect(PHASE_THRESHOLD_ENRAGED).toBe(0.2);
    expect(MELEE_RANGE).toBe(150);
    expect(BREATH_RANGE).toBe(400);
    expect(COOLDOWN_MS.calm).toBe(2000);
    expect(COOLDOWN_MS.awakened).toBe(1500);
    expect(COOLDOWN_MS.enraged).toBe(800);
    expect(ENRAGE_ROAR_COOLDOWN_MS).toBe(2000);
  });
});

describe("createInitialState", () => {
  it("returns a fresh calm state ready to act", () => {
    const s = createInitialState();
    expect(s.phase).toBe("calm");
    expect(s.cooldownMs).toBe(0);
    expect(s.enrageTriggered).toBe(false);
    expect(s.actionCounter).toBe(0);
  });

  it("returns a new object on each call", () => {
    expect(createInitialState()).not.toBe(createInitialState());
  });
});

describe("tickImoogi — phase determination", () => {
  it("stays calm above the awakened threshold", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.9, playerDistance: 50 }),
    );
    expect(state.phase).toBe("calm");
  });

  it("enters calm at the exact awakened threshold (0.66 is boundary)", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.66, playerDistance: 50 }),
    );
    expect(state.phase).toBe("awakened");
  });

  it("enters awakened just below 0.66", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.65, playerDistance: 50 }),
    );
    expect(state.phase).toBe("awakened");
  });

  it("enters enraged at the exact enraged threshold (0.2)", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.2, playerDistance: 50 }),
    );
    expect(state.phase).toBe("enraged");
  });

  it("clamps hpRatio above 1 to calm", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 2.5, playerDistance: 50 }),
    );
    expect(state.phase).toBe("calm");
  });

  it("clamps negative hpRatio to enraged", () => {
    const { state } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: -1, playerDistance: 50 }),
    );
    expect(state.phase).toBe("enraged");
  });
});

describe("tickImoogi — action selection (no cooldown)", () => {
  it("picks melee when player is within MELEE_RANGE", () => {
    const { action } = tickImoogi(
      createInitialState(),
      makeInput({ playerDistance: 50 }),
    );
    expect(action).toBe("melee");
  });

  it("picks breath when player is beyond BREATH_RANGE", () => {
    const { action } = tickImoogi(
      createInitialState(),
      makeInput({ playerDistance: 500 }),
    );
    expect(action).toBe("breath");
  });

  it("mid-range in calm phase → melee", () => {
    const { action } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 1, playerDistance: 250 }),
    );
    expect(action).toBe("melee");
  });

  it("mid-range in awakened phase → tail_sweep", () => {
    const { action } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.5, playerDistance: 250 }),
    );
    expect(action).toBe("tail_sweep");
  });

  it("mid-range in enraged phase alternates tail_sweep / melee via actionCounter", () => {
    // First entry into enraged triggers enrage_roar, so prime state to past-roar enraged.
    const primed: ImoogiState = {
      phase: "enraged",
      cooldownMs: 0,
      enrageTriggered: true,
      actionCounter: 0,
    };
    const first = tickImoogi(
      primed,
      makeInput({ hpRatio: 0.1, playerDistance: 250 }),
    );
    expect(first.action).toBe("tail_sweep");
    // Second tick would normally be on cooldown — pass a large deltaMs to
    // clear it and verify the alternation based on actionCounter parity.
    const clearedSecondInput: ImoogiTickInput = {
      hpRatio: 0.1,
      playerDistance: 250,
      deltaMs: 10000,
    };
    const cleared = tickImoogi(first.state, clearedSecondInput);
    expect(cleared.action).toBe("melee");
  });
});

describe("tickImoogi — cooldown", () => {
  it("returns idle while cooldownMs > deltaMs", () => {
    const state: ImoogiState = {
      phase: "calm",
      cooldownMs: 1000,
      enrageTriggered: false,
      actionCounter: 3,
    };
    const { state: next, action } = tickImoogi(
      state,
      makeInput({ hpRatio: 1, playerDistance: 50, deltaMs: 100 }),
    );
    expect(action).toBe("idle");
    expect(next.cooldownMs).toBe(900);
    expect(next.actionCounter).toBe(3); // unchanged during idle
  });

  it("clamps cooldown at zero (cannot go negative)", () => {
    const state: ImoogiState = {
      phase: "calm",
      cooldownMs: 50,
      enrageTriggered: false,
      actionCounter: 0,
    };
    const { state: next } = tickImoogi(
      state,
      makeInput({ hpRatio: 1, playerDistance: 50, deltaMs: 200 }),
    );
    expect(next.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it("deltaMs=0 preserves cooldownMs exactly", () => {
    const state: ImoogiState = {
      phase: "calm",
      cooldownMs: 500,
      enrageTriggered: false,
      actionCounter: 0,
    };
    const { state: next, action } = tickImoogi(
      state,
      makeInput({ hpRatio: 1, playerDistance: 50, deltaMs: 0 }),
    );
    expect(next.cooldownMs).toBe(500);
    expect(action).toBe("idle");
  });

  it("sets cooldown according to phase after a non-idle action", () => {
    const calm = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 1, playerDistance: 50 }),
    );
    expect(calm.state.cooldownMs).toBe(COOLDOWN_MS.calm);

    const awakened = tickImoogi(
      {
        phase: "calm",
        cooldownMs: 0,
        enrageTriggered: false,
        actionCounter: 0,
      },
      makeInput({ hpRatio: 0.5, playerDistance: 50 }),
    );
    expect(awakened.state.cooldownMs).toBe(COOLDOWN_MS.awakened);

    const enragedPast: ImoogiState = {
      phase: "enraged",
      cooldownMs: 0,
      enrageTriggered: true,
      actionCounter: 0,
    };
    const enraged = tickImoogi(
      enragedPast,
      makeInput({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(enraged.state.cooldownMs).toBe(COOLDOWN_MS.enraged);
  });
});

describe("tickImoogi — enrage_roar", () => {
  it("fires exactly once on first entry into enraged phase", () => {
    const { state, action } = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(action).toBe("enrage_roar");
    expect(state.phase).toBe("enraged");
    expect(state.enrageTriggered).toBe(true);
    expect(state.cooldownMs).toBe(ENRAGE_ROAR_COOLDOWN_MS);
    expect(state.actionCounter).toBe(1);
  });

  it("does not re-fire if hp recovers above threshold and drops again", () => {
    const firstDrop = tickImoogi(
      createInitialState(),
      makeInput({ hpRatio: 0.1, playerDistance: 50 }),
    );
    expect(firstDrop.action).toBe("enrage_roar");

    // Heal: phase back to calm, but enrageTriggered remains true
    const healed = tickImoogi(
      firstDrop.state,
      makeInput({ hpRatio: 0.9, playerDistance: 50, deltaMs: 5000 }),
    );
    expect(healed.state.enrageTriggered).toBe(true);

    // Drop again
    const secondDrop = tickImoogi(
      healed.state,
      makeInput({ hpRatio: 0.05, playerDistance: 50, deltaMs: 5000 }),
    );
    expect(secondDrop.action).not.toBe("enrage_roar");
  });

  it("enrage_roar overrides an existing cooldown (fires even mid-cooldown)", () => {
    const midCooldown: ImoogiState = {
      phase: "awakened",
      cooldownMs: 800,
      enrageTriggered: false,
      actionCounter: 5,
    };
    const { action, state } = tickImoogi(
      midCooldown,
      makeInput({ hpRatio: 0.1, playerDistance: 50, deltaMs: 16 }),
    );
    expect(action).toBe("enrage_roar");
    expect(state.cooldownMs).toBe(ENRAGE_ROAR_COOLDOWN_MS);
  });
});

describe("tickImoogi — purity", () => {
  it("does not mutate the input state", () => {
    const state: ImoogiState = {
      phase: "calm",
      cooldownMs: 500,
      enrageTriggered: false,
      actionCounter: 2,
    };
    const snapshot = { ...state };
    tickImoogi(state, makeInput());
    expect(state).toEqual(snapshot);
  });

  it("does not mutate the input tick input", () => {
    const input: ImoogiTickInput = {
      hpRatio: 0.5,
      playerDistance: 100,
      deltaMs: 16,
    };
    const snapshot = { ...input };
    tickImoogi(createInitialState(), input);
    expect(input).toEqual(snapshot);
  });

  it("returns a new state object each call (never the same reference)", () => {
    const s0 = createInitialState();
    const r = tickImoogi(s0, makeInput());
    expect(r.state).not.toBe(s0);
  });
});
