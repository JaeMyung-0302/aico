export type RunOutcome = "completed" | "abandoned" | "failed";

export interface DungeonRunState {
  readonly active: boolean;
  readonly currentFloor: number;
  readonly inventory: ReadonlyArray<string>;
  readonly goldCollected: number;
}

export interface RunResult {
  readonly outcome: RunOutcome;
  readonly floor: number;
  readonly gold: number;
  readonly items: ReadonlyArray<string>;
}

export interface RunResolution {
  readonly result: RunResult;
  readonly next: DungeonRunState;
}

export const createInitialRun = (): DungeonRunState => ({
  active: false,
  currentFloor: 0,
  inventory: [],
  goldCollected: 0,
});

const requireActive = (state: DungeonRunState, op: string): void => {
  if (!state.active) {
    throw new Error(`${op}: no active dungeon run`);
  }
};

export const startRun = (state: DungeonRunState): DungeonRunState => {
  if (state.active) {
    throw new Error("startRun: a run is already active");
  }
  return {
    active: true,
    currentFloor: 1,
    inventory: [],
    goldCollected: 0,
  };
};

export const advanceFloor = (state: DungeonRunState): DungeonRunState => {
  requireActive(state, "advanceFloor");
  return { ...state, currentFloor: state.currentFloor + 1 };
};

export const collectItem = (
  state: DungeonRunState,
  itemId: string,
): DungeonRunState => {
  requireActive(state, "collectItem");
  return { ...state, inventory: [...state.inventory, itemId] };
};

export const collectGold = (
  state: DungeonRunState,
  amount: number,
): DungeonRunState => {
  requireActive(state, "collectGold");
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`collectGold: amount must be >= 0, got ${amount}`);
  }
  return { ...state, goldCollected: state.goldCollected + amount };
};

const resolve = (
  state: DungeonRunState,
  outcome: RunOutcome,
  op: string,
): RunResolution => {
  requireActive(state, op);
  return {
    result: {
      outcome,
      floor: state.currentFloor,
      gold: state.goldCollected,
      items: state.inventory,
    },
    next: createInitialRun(),
  };
};

export const abandonRun = (state: DungeonRunState): RunResolution =>
  resolve(state, "abandoned", "abandonRun");

export const completeRun = (state: DungeonRunState): RunResolution =>
  resolve(state, "completed", "completeRun");

export const failRun = (state: DungeonRunState): RunResolution =>
  resolve(state, "failed", "failRun");
