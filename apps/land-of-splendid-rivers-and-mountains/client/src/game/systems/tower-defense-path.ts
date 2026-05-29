export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Path = ReadonlyArray<Point>;

export interface PathProgress {
  readonly distanceTraveled: number;
  readonly totalDistance: number;
}

export interface PathAdvanceResult {
  readonly progress: PathProgress;
  readonly position: Point;
  readonly reachedEnd: boolean;
}

// 마을 방어전의 기본 침공 경로 (산 입구 → 방어선 → 마을 광장)
export const DEFAULT_PATH: Path = [
  { x: 0, y: 240 },
  { x: 180, y: 240 },
  { x: 180, y: 120 },
  { x: 420, y: 120 },
  { x: 420, y: 300 },
  { x: 640, y: 300 },
];

const distance = (a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const clamp = (n: number, min: number, max: number): number => {
  if (n < min) return min;
  if (n > max) return max;
  return n;
};

export const pathLength = (path: Path): number => {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += distance(path[i - 1]!, path[i]!);
  }
  return total;
};

export const positionAt = (path: Path, dist: number): Point => {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return { ...path[0]! };

  const total = pathLength(path);
  const clamped = clamp(dist, 0, total);

  let remaining = clamped;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]!;
    const curr = path[i]!;
    const segLen = distance(prev, curr);
    if (remaining <= segLen || i === path.length - 1) {
      if (segLen === 0) return { ...curr };
      const t = remaining / segLen;
      return {
        x: prev.x + (curr.x - prev.x) * t,
        y: prev.y + (curr.y - prev.y) * t,
      };
    }
    remaining -= segLen;
  }
  return { ...path[path.length - 1]! };
};

export const createPathProgress = (path: Path): PathProgress => ({
  distanceTraveled: 0,
  totalDistance: pathLength(path),
});

export const advanceAlongPath = (
  path: Path,
  progress: PathProgress,
  deltaDistance: number,
): PathAdvanceResult => {
  const nextDistance = clamp(
    progress.distanceTraveled + deltaDistance,
    0,
    progress.totalDistance,
  );
  const reachedEnd =
    progress.totalDistance > 0 && nextDistance >= progress.totalDistance;
  return {
    progress: {
      distanceTraveled: nextDistance,
      totalDistance: progress.totalDistance,
    },
    position: positionAt(path, nextDistance),
    reachedEnd,
  };
};
