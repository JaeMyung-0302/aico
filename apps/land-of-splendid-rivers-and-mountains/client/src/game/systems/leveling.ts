/**
 * 전투 레벨링 곡선 (순수 로직).
 * 던전 1~2층 누적 처치(약 95exp)로 3층 진입 전 레벨 3에 도달하도록 설계 —
 * 미구현 상태에서는 HP 50 고정으로 3층(구미호×2+장산범)이 사실상 클리어 불가였음.
 */
export const EXP_BASE = 30;

export const expRequiredFor = (level: number): number => level * EXP_BASE;

export interface LevelUpResult {
  readonly level: number;
  readonly exp: number;
  readonly levelsGained: number;
}

export const applyExp = (
  level: number,
  exp: number,
  gained: number,
): LevelUpResult => {
  let newLevel = level;
  let newExp = exp + Math.max(0, gained);
  let levelsGained = 0;

  while (newExp >= expRequiredFor(newLevel)) {
    newExp -= expRequiredFor(newLevel);
    newLevel += 1;
    levelsGained += 1;
  }

  return { level: newLevel, exp: newExp, levelsGained };
};

export const LEVEL_UP_BONUS = {
  maxHp: 10,
  attack: 2,
  defense: 1,
} as const;
