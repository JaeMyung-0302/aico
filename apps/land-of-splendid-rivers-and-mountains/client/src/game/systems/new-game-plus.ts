export interface NewGamePlusState {
  readonly cycleCount: number;
  readonly unlockedBonuses: ReadonlyArray<string>;
}

export interface NgPlusEligibility {
  readonly canStart: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export const STARTING_CYCLE = 0;
export const MAX_CYCLE = 3;

// 누적형 — 각 cycle 의 보너스는 이전 모든 cycle 의 보너스를 포함한다.
export const PERMANENT_BONUSES_BY_CYCLE: Readonly<
  Record<number, ReadonlyArray<string>>
> = {
  1: ["bonus-extra-storage"],
  2: ["bonus-extra-storage", "bonus-fast-energy-regen"],
  3: ["bonus-extra-storage", "bonus-fast-energy-regen", "bonus-rare-seed-pool"],
};

export const createInitialNgPlusState = (): NewGamePlusState => ({
  cycleCount: STARTING_CYCLE,
  unlockedBonuses: [],
});

export const isEligibleForNewGamePlus = (
  mainQuestComplete: boolean,
  state: NewGamePlusState,
): NgPlusEligibility => {
  const reasons: string[] = [];
  if (!mainQuestComplete) reasons.push("mainQuestIncomplete");
  if (state.cycleCount >= MAX_CYCLE) reasons.push("maxCycleReached");
  return { canStart: reasons.length === 0, reasons };
};

export const advanceCycle = (state: NewGamePlusState): NewGamePlusState => {
  if (state.cycleCount >= MAX_CYCLE) {
    throw new Error(
      `advanceCycle: cycleCount=${state.cycleCount} already at MAX_CYCLE=${MAX_CYCLE}`,
    );
  }
  const nextCycle = state.cycleCount + 1;
  return {
    cycleCount: nextCycle,
    unlockedBonuses: PERMANENT_BONUSES_BY_CYCLE[nextCycle] ?? [],
  };
};
