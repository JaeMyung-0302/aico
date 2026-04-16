import { describe, it, expect } from "vitest";
import {
  DEFAULT_PATH,
  pathLength,
  positionAt,
  advanceAlongPath,
  createPathProgress,
  type Point,
  type Path,
  type PathProgress,
} from "../game/systems/tower-defense-path";

const approxPoint = (p: Point, expected: Point): void => {
  expect(p.x).toBeCloseTo(expected.x, 5);
  expect(p.y).toBeCloseTo(expected.y, 5);
};

describe("DEFAULT_PATH", () => {
  it("has at least 3 waypoints", () => {
    expect(DEFAULT_PATH.length).toBeGreaterThanOrEqual(3);
  });

  it("has strictly positive total length", () => {
    expect(pathLength(DEFAULT_PATH)).toBeGreaterThan(0);
  });
});

describe("pathLength", () => {
  it("returns 0 for an empty path", () => {
    expect(pathLength([])).toBe(0);
  });

  it("returns 0 for a single-point path", () => {
    expect(pathLength([{ x: 10, y: 20 }])).toBe(0);
  });

  it("returns euclidean distance for two points", () => {
    const p: Path = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];
    expect(pathLength(p)).toBe(5);
  });

  it("sums multi-segment lengths", () => {
    const p: Path = [
      { x: 0, y: 0 },
      { x: 3, y: 4 }, // +5
      { x: 3, y: 10 }, // +6
      { x: 11, y: 10 }, // +8
    ];
    expect(pathLength(p)).toBe(19);
  });
});

describe("positionAt", () => {
  const p: Path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("returns the first waypoint at distance 0", () => {
    approxPoint(positionAt(p, 0), { x: 0, y: 0 });
  });

  it("returns the last waypoint at total length", () => {
    approxPoint(positionAt(p, 20), { x: 10, y: 10 });
  });

  it("clamps beyond the total length to the last waypoint", () => {
    approxPoint(positionAt(p, 999), { x: 10, y: 10 });
  });

  it("clamps negative distance to the first waypoint", () => {
    approxPoint(positionAt(p, -5), { x: 0, y: 0 });
  });

  it("interpolates within the first segment", () => {
    approxPoint(positionAt(p, 3), { x: 3, y: 0 });
  });

  it("interpolates within the second segment", () => {
    approxPoint(positionAt(p, 14), { x: 10, y: 4 });
  });

  it("lands on the waypoint exactly at segment boundary", () => {
    approxPoint(positionAt(p, 10), { x: 10, y: 0 });
  });

  it("handles empty path by returning origin", () => {
    approxPoint(positionAt([], 5), { x: 0, y: 0 });
  });

  it("handles single-point path", () => {
    approxPoint(positionAt([{ x: 7, y: 8 }], 999), { x: 7, y: 8 });
  });
});

describe("createPathProgress", () => {
  it("starts at distance 0 with totalDistance = path length", () => {
    const pr = createPathProgress(DEFAULT_PATH);
    expect(pr.distanceTraveled).toBe(0);
    expect(pr.totalDistance).toBe(pathLength(DEFAULT_PATH));
  });

  it("returns a fresh object each call", () => {
    expect(createPathProgress(DEFAULT_PATH)).not.toBe(
      createPathProgress(DEFAULT_PATH),
    );
  });
});

describe("advanceAlongPath", () => {
  const p: Path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("advances within a single segment", () => {
    const pr: PathProgress = {
      distanceTraveled: 0,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, 3);
    expect(r.progress.distanceTraveled).toBe(3);
    approxPoint(r.position, { x: 3, y: 0 });
    expect(r.reachedEnd).toBe(false);
  });

  it("advances across segment boundaries", () => {
    const pr: PathProgress = {
      distanceTraveled: 8,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, 5); // lands at 13 → second segment, y=3
    expect(r.progress.distanceTraveled).toBe(13);
    approxPoint(r.position, { x: 10, y: 3 });
    expect(r.reachedEnd).toBe(false);
  });

  it("reports reachedEnd and clamps when stepping past totalDistance", () => {
    const pr: PathProgress = {
      distanceTraveled: 18,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, 10);
    expect(r.reachedEnd).toBe(true);
    expect(r.progress.distanceTraveled).toBe(20);
    approxPoint(r.position, { x: 10, y: 10 });
  });

  it("reports reachedEnd exactly at the boundary", () => {
    const pr: PathProgress = {
      distanceTraveled: 15,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, 5);
    expect(r.reachedEnd).toBe(true);
    expect(r.progress.distanceTraveled).toBe(20);
  });

  it("deltaDistance=0 holds position", () => {
    const pr: PathProgress = {
      distanceTraveled: 7,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, 0);
    expect(r.progress.distanceTraveled).toBe(7);
    approxPoint(r.position, { x: 7, y: 0 });
    expect(r.reachedEnd).toBe(false);
  });

  it("negative deltaDistance does not move backward past 0", () => {
    const pr: PathProgress = {
      distanceTraveled: 5,
      totalDistance: 20,
    };
    const r = advanceAlongPath(p, pr, -100);
    expect(r.progress.distanceTraveled).toBe(0);
    approxPoint(r.position, { x: 0, y: 0 });
  });
});

describe("purity", () => {
  const p: Path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("advanceAlongPath does not mutate input progress", () => {
    const pr: PathProgress = {
      distanceTraveled: 5,
      totalDistance: 20,
    };
    const snapshot = { ...pr };
    advanceAlongPath(p, pr, 3);
    expect(pr).toEqual(snapshot);
  });

  it("advanceAlongPath does not mutate input path", () => {
    const original = structuredClone(p);
    advanceAlongPath(p, createPathProgress(p), 5);
    expect(p).toEqual(original);
  });
});
