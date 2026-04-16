export type PirateKingPhase = "fresh" | "bloodied" | "desperate";

export type PirateKingAction =
  | "idle"
  | "cutlass_swing"
  | "pistol_shot"
  | "cannon_broadside"
  | "rally";

export interface PirateKingState {
  readonly phase: PirateKingPhase;
  readonly cooldownMs: number;
  readonly rallyTriggered: boolean;
  readonly actionCounter: number;
}

export interface PirateKingTickInput {
  readonly hpRatio: number;
  readonly playerDistance: number;
  readonly deltaMs: number;
}

export interface PirateKingTickResult {
  readonly state: PirateKingState;
  readonly action: PirateKingAction;
}

export const PHASE_THRESHOLD_BLOODIED = 0.5;
export const PHASE_THRESHOLD_DESPERATE = 0.2;
export const CUTLASS_RANGE = 130;
export const CANNON_RANGE_MIN = 420;
export const COOLDOWN_MS: Readonly<Record<PirateKingPhase, number>> = {
  fresh: 1800,
  bloodied: 1200,
  desperate: 700,
};
export const RALLY_COOLDOWN_MS = 2000;

const clamp01 = (n: number): number => {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
};

const derivePhase = (hpRatio: number): PirateKingPhase => {
  const r = clamp01(hpRatio);
  if (r <= PHASE_THRESHOLD_DESPERATE) return "desperate";
  if (r <= PHASE_THRESHOLD_BLOODIED) return "bloodied";
  return "fresh";
};

export const createInitialPirateState = (): PirateKingState => ({
  phase: "fresh",
  cooldownMs: 0,
  rallyTriggered: false,
  actionCounter: 0,
});

const pickAttack = (playerDistance: number): PirateKingAction => {
  if (playerDistance < CUTLASS_RANGE) return "cutlass_swing";
  if (playerDistance > CANNON_RANGE_MIN) return "cannon_broadside";
  // Mid-range: all phases use pistol_shot; the cooldown differs by phase
  // (set by the caller), not the action itself.
  return "pistol_shot";
};

export const tickPirateKing = (
  state: PirateKingState,
  input: PirateKingTickInput,
): PirateKingTickResult => {
  const newPhase = derivePhase(input.hpRatio);

  // Rally fires once on first entry to desperate and overrides existing cooldown.
  if (newPhase === "desperate" && !state.rallyTriggered) {
    return {
      state: {
        phase: newPhase,
        cooldownMs: RALLY_COOLDOWN_MS,
        rallyTriggered: true,
        actionCounter: state.actionCounter + 1,
      },
      action: "rally",
    };
  }

  const cooldownAfter = Math.max(0, state.cooldownMs - input.deltaMs);
  if (cooldownAfter > 0 || state.cooldownMs > input.deltaMs) {
    return {
      state: {
        phase: newPhase,
        cooldownMs: cooldownAfter,
        rallyTriggered: state.rallyTriggered,
        actionCounter: state.actionCounter,
      },
      action: "idle",
    };
  }

  const action = pickAttack(input.playerDistance);
  return {
    state: {
      phase: newPhase,
      cooldownMs: COOLDOWN_MS[newPhase],
      rallyTriggered: state.rallyTriggered,
      actionCounter: state.actionCounter + 1,
    },
    action,
  };
};
