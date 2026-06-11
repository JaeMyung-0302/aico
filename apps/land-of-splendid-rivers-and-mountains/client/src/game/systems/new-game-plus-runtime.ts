import {
  advanceCycle,
  createInitialNgPlusState,
  isEligibleForNewGamePlus,
  type NewGamePlusState,
} from "./new-game-plus";

// 회차 상태는 세이브 삭제(새 게임)에도 살아남아야 하므로 별도 키에 보존.
const NG_PLUS_KEY = "land-of-splendid-rivers-and-mountains:ngplus";

export const loadNgPlus = (): NewGamePlusState => {
  try {
    const raw = localStorage.getItem(NG_PLUS_KEY);
    if (!raw) return createInitialNgPlusState();
    const parsed = JSON.parse(raw) as NewGamePlusState;
    if (typeof parsed.cycleCount !== "number") {
      return createInitialNgPlusState();
    }
    return parsed;
  } catch {
    return createInitialNgPlusState();
  }
};

const saveNgPlus = (state: NewGamePlusState): void => {
  localStorage.setItem(NG_PLUS_KEY, JSON.stringify(state));
};

/** 엔딩 도달 후 회차 진행 가능 여부 */
export const canStartNgPlus = (endingReached: boolean): boolean =>
  isEligibleForNewGamePlus(endingReached, loadNgPlus()).canStart;

/** 회차 +1 기록 (호출 후 세이브 삭제+리로드는 호출부 책임) */
export const startNgPlusCycle = (): NewGamePlusState => {
  const next = advanceCycle(loadNgPlus());
  saveNgPlus(next);
  return next;
};

/** 새 게임 시작 시 회차 보너스: 골드 +500×회차, 3회차+ 인삼 씨앗 */
export const ngPlusStartingPerks = (): {
  gold: number;
  items: ReadonlyArray<{ itemId: string; quantity: number }>;
} => {
  const state = loadNgPlus();
  const items: { itemId: string; quantity: number }[] = [];
  if (state.unlockedBonuses.includes("bonus-rare-seed-pool")) {
    items.push({ itemId: "seed-ginseng", quantity: 3 });
  }
  return { gold: state.cycleCount * 500, items };
};
