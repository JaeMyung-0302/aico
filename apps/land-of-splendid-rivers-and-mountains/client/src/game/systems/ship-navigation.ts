export type NavigationOutcome = "in_progress" | "success" | "failed";

export interface NavigationState {
  readonly positionY: number;
  readonly distanceRemaining: number;
  readonly damage: number;
  readonly outcome: NavigationOutcome;
}

export interface NavigationTickInput {
  readonly deltaMs: number;
  readonly playerSteer: -1 | 0 | 1;
  readonly hazardY: number | null;
}

// Tuning constants — world units / ms for lateral steering & forward speed.
export const LANE_HALF_WIDTH = 100;
export const HAZARD_RADIUS = 30;
export const MAX_DAMAGE = 100;
export const STEER_SPEED_PER_MS = 0.3;
export const DISTANCE_SPEED_PER_MS = 0.5;
export const DAMAGE_PER_COLLISION_MS = 0.15;

const clamp = (n: number, min: number, max: number): number => {
  if (n < min) return min;
  if (n > max) return max;
  return n;
};

export const createInitialNavigationState = (
  distance: number,
): NavigationState => {
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error(
      `createInitialNavigationState: distance must be > 0, got ${distance}`,
    );
  }
  return {
    positionY: 0,
    distanceRemaining: distance,
    damage: 0,
    outcome: "in_progress",
  };
};

export const tickNavigation = (
  state: NavigationState,
  input: NavigationTickInput,
): NavigationState => {
  if (!Number.isFinite(input.deltaMs) || input.deltaMs < 0) {
    throw new Error(
      `tickNavigation: deltaMs must be >= 0, got ${input.deltaMs}`,
    );
  }
  if (state.outcome !== "in_progress") return state;
  if (input.deltaMs === 0) return state;

  const nextPositionY = clamp(
    state.positionY + input.playerSteer * STEER_SPEED_PER_MS * input.deltaMs,
    -LANE_HALF_WIDTH,
    LANE_HALF_WIDTH,
  );

  const nextDistance =
    state.distanceRemaining - DISTANCE_SPEED_PER_MS * input.deltaMs;

  let nextDamage = state.damage;
  if (
    input.hazardY !== null &&
    Math.abs(nextPositionY - input.hazardY) <= HAZARD_RADIUS
  ) {
    nextDamage = state.damage + DAMAGE_PER_COLLISION_MS * input.deltaMs;
  }

  let outcome: NavigationOutcome = "in_progress";
  if (nextDamage >= MAX_DAMAGE) outcome = "failed";
  else if (nextDistance <= 0) outcome = "success";

  return {
    positionY: nextPositionY,
    distanceRemaining: nextDistance,
    damage: nextDamage,
    outcome,
  };
};
