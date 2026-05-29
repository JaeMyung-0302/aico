export type ImoogiPhase = "calm" | "awakened" | "enraged";

export type ImoogiAction =
  | "idle"
  | "melee"
  | "breath"
  | "tail_sweep"
  | "enrage_roar";

export interface ImoogiState {
  readonly phase: ImoogiPhase;
  readonly cooldownMs: number;
  readonly enrageTriggered: boolean;
  readonly actionCounter: number;
}

export interface ImoogiTickInput {
  readonly hpRatio: number;
  readonly playerDistance: number;
  readonly deltaMs: number;
}

export interface ImoogiTickResult {
  readonly state: ImoogiState;
  readonly action: ImoogiAction;
}

export const PHASE_THRESHOLD_AWAKENED = 0.66;
export const PHASE_THRESHOLD_ENRAGED = 0.2;
export const MELEE_RANGE = 150;
export const BREATH_RANGE = 400;
export const COOLDOWN_MS: Readonly<Record<ImoogiPhase, number>> = {
  calm: 2000,
  awakened: 1500,
  enraged: 800,
};
export const ENRAGE_ROAR_COOLDOWN_MS = 2000;

const clamp01 = (n: number): number => {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
};

const derivePhase = (hpRatio: number): ImoogiPhase => {
  const r = clamp01(hpRatio);
  if (r <= PHASE_THRESHOLD_ENRAGED) return "enraged";
  if (r <= PHASE_THRESHOLD_AWAKENED) return "awakened";
  return "calm";
};

export const createInitialState = (): ImoogiState => ({
  phase: "calm",
  cooldownMs: 0,
  enrageTriggered: false,
  actionCounter: 0,
});

const pickMidRangeAction = (
  phase: ImoogiPhase,
  actionCounter: number,
): ImoogiAction => {
  if (phase === "calm") return "melee";
  if (phase === "awakened") return "tail_sweep";
  // enraged: alternate tail_sweep (even counter) / melee (odd counter)
  return actionCounter % 2 === 0 ? "tail_sweep" : "melee";
};

const pickAttack = (
  phase: ImoogiPhase,
  playerDistance: number,
  actionCounter: number,
): ImoogiAction => {
  if (playerDistance < MELEE_RANGE) return "melee";
  if (playerDistance > BREATH_RANGE) return "breath";
  return pickMidRangeAction(phase, actionCounter);
};

export const tickImoogi = (
  state: ImoogiState,
  input: ImoogiTickInput,
): ImoogiTickResult => {
  const newPhase = derivePhase(input.hpRatio);

  // Enrage roar overrides everything on first entry.
  if (newPhase === "enraged" && !state.enrageTriggered) {
    return {
      state: {
        phase: newPhase,
        cooldownMs: ENRAGE_ROAR_COOLDOWN_MS,
        enrageTriggered: true,
        actionCounter: state.actionCounter + 1,
      },
      action: "enrage_roar",
    };
  }

  const cooldownAfterDecrement = Math.max(0, state.cooldownMs - input.deltaMs);

  // Still on cooldown → idle, no action counter change.
  if (cooldownAfterDecrement > 0 || state.cooldownMs > input.deltaMs) {
    return {
      state: {
        phase: newPhase,
        cooldownMs: cooldownAfterDecrement,
        enrageTriggered: state.enrageTriggered,
        actionCounter: state.actionCounter,
      },
      action: "idle",
    };
  }

  // Off cooldown — select and fire an attack.
  const action = pickAttack(
    newPhase,
    input.playerDistance,
    state.actionCounter,
  );
  return {
    state: {
      phase: newPhase,
      cooldownMs: COOLDOWN_MS[newPhase],
      enrageTriggered: state.enrageTriggered,
      actionCounter: state.actionCounter + 1,
    },
    action,
  };
};
