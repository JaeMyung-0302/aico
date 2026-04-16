import { describe, it, expect } from "vitest";
import {
  generateFloor,
  type Room,
  type DungeonFloor,
} from "../game/systems/infinite-dungeon-floor";

const roomsOverlap = (a: Room, b: Room, buffer: number): boolean =>
  !(
    a.x + a.w + buffer <= b.x ||
    b.x + b.w + buffer <= a.x ||
    a.y + a.h + buffer <= b.y ||
    b.y + b.h + buffer <= a.y
  );

const sampleFloor = (): DungeonFloor =>
  generateFloor({ seed: 42, width: 30, height: 20, targetRooms: 5 });

describe("generateFloor — determinism", () => {
  it("same seed produces identical output", () => {
    const a = generateFloor({ seed: 7, width: 30, height: 20, targetRooms: 5 });
    const b = generateFloor({ seed: 7, width: 30, height: 20, targetRooms: 5 });
    expect(a).toEqual(b);
  });

  it("different seeds produce different outputs", () => {
    const a = generateFloor({ seed: 1, width: 30, height: 20, targetRooms: 5 });
    const b = generateFloor({ seed: 2, width: 30, height: 20, targetRooms: 5 });
    expect(a).not.toEqual(b);
  });

  it("records the seed used", () => {
    const f = generateFloor({
      seed: 999,
      width: 30,
      height: 20,
      targetRooms: 4,
    });
    expect(f.seed).toBe(999);
  });
});

describe("generateFloor — bounds and shape", () => {
  it("records the requested width and height", () => {
    const f = generateFloor({
      seed: 1,
      width: 25,
      height: 18,
      targetRooms: 4,
    });
    expect(f.width).toBe(25);
    expect(f.height).toBe(18);
  });

  it("places all rooms entirely within bounds", () => {
    const f = sampleFloor();
    expect(f.rooms.length).toBeGreaterThan(0);
    for (const r of f.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(f.width);
      expect(r.y + r.h).toBeLessThanOrEqual(f.height);
    }
  });

  it("rooms have at least minimum dimensions", () => {
    const f = sampleFloor();
    for (const r of f.rooms) {
      expect(r.w).toBeGreaterThanOrEqual(3);
      expect(r.h).toBeGreaterThanOrEqual(3);
    }
  });

  it("no rooms overlap with a 1-tile wall buffer", () => {
    const f = sampleFloor();
    for (let i = 0; i < f.rooms.length; i++) {
      for (let j = i + 1; j < f.rooms.length; j++) {
        expect(roomsOverlap(f.rooms[i]!, f.rooms[j]!, 1)).toBe(false);
      }
    }
  });
});

describe("generateFloor — entry/exit", () => {
  it("entryRoomIndex points to a real room", () => {
    const f = sampleFloor();
    expect(f.entryRoomIndex).toBeGreaterThanOrEqual(0);
    expect(f.entryRoomIndex).toBeLessThan(f.rooms.length);
  });

  it("exitRoomIndex points to a real room", () => {
    const f = sampleFloor();
    expect(f.exitRoomIndex).toBeGreaterThanOrEqual(0);
    expect(f.exitRoomIndex).toBeLessThan(f.rooms.length);
  });

  it("entry and exit are different rooms when at least 2 rooms exist", () => {
    const f = sampleFloor();
    if (f.rooms.length >= 2) {
      expect(f.entryRoomIndex).not.toBe(f.exitRoomIndex);
    }
  });
});

describe("generateFloor — degenerate inputs", () => {
  it("returns 0 rooms when targetRooms is 0", () => {
    const f = generateFloor({
      seed: 1,
      width: 30,
      height: 20,
      targetRooms: 0,
    });
    expect(f.rooms.length).toBe(0);
    expect(f.entryRoomIndex).toBe(-1);
    expect(f.exitRoomIndex).toBe(-1);
  });

  it("throws when width is too small to fit any room", () => {
    expect(() =>
      generateFloor({ seed: 1, width: 2, height: 20, targetRooms: 5 }),
    ).toThrow();
  });

  it("throws when height is too small to fit any room", () => {
    expect(() =>
      generateFloor({ seed: 1, width: 30, height: 2, targetRooms: 5 }),
    ).toThrow();
  });

  it("may place fewer rooms than targetRooms when space is tight", () => {
    // Tight 8x8 bounds with min room 3x3 + buffer cannot fit 10 rooms
    const f = generateFloor({
      seed: 1,
      width: 8,
      height: 8,
      targetRooms: 10,
    });
    expect(f.rooms.length).toBeLessThanOrEqual(10);
    expect(f.rooms.length).toBeGreaterThan(0);
  });
});

describe("generateFloor — purity", () => {
  it("calling twice does not affect each other", () => {
    const a = sampleFloor();
    const b = sampleFloor();
    expect(a).toEqual(b);
  });
});
