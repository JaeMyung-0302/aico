// Local Point type. Will align with tower-defense-path.Point once both
// branches land on main.
export interface Point {
  readonly x: number;
  readonly y: number;
}

export type TargetStrategy = "closest" | "first" | "strongest" | "weakest";

export interface Tower {
  readonly position: Point;
  readonly range: number;
}

export interface TDEnemy {
  readonly id: string;
  readonly position: Point;
  readonly hp: number;
  readonly maxHp: number;
  readonly pathProgress: number;
}

const distanceSquared = (a: Point, b: Point): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const withinRange = (tower: Tower, enemy: TDEnemy): boolean =>
  distanceSquared(tower.position, enemy.position) <= tower.range * tower.range;

const score = (
  strategy: TargetStrategy,
  enemy: TDEnemy,
  tower: Tower,
): number => {
  switch (strategy) {
    case "closest":
      return -distanceSquared(tower.position, enemy.position);
    case "first":
      return enemy.pathProgress;
    case "strongest":
      return enemy.hp;
    case "weakest":
      return -enemy.hp;
  }
};

export const selectTarget = (
  tower: Tower,
  enemies: ReadonlyArray<TDEnemy>,
  strategy: TargetStrategy,
): TDEnemy | null => {
  let best: TDEnemy | null = null;
  let bestScore = -Infinity;
  for (const enemy of enemies) {
    if (!withinRange(tower, enemy)) continue;
    const s = score(strategy, enemy, tower);
    // Strictly greater so earlier entries win ties (deterministic).
    if (s > bestScore) {
      bestScore = s;
      best = enemy;
    }
  }
  return best;
};
