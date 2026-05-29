export interface Room {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface DungeonFloor {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly rooms: ReadonlyArray<Room>;
  readonly entryRoomIndex: number;
  readonly exitRoomIndex: number;
}

export interface GenerateFloorInput {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly targetRooms: number;
}

const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 6;
const ROOM_BUFFER = 1;
const PLACEMENT_ATTEMPTS_PER_ROOM = 30;

// Linear congruential generator. Returns a stateful (per-call) function
// producing values in [0, 1). Deterministic across runs given the same seed.
const createPrng = (seed: number): (() => number) => {
  let state = seed | 0 || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

const randomInt = (rand: () => number, min: number, max: number): number =>
  Math.floor(rand() * (max - min + 1)) + min;

const overlapsWithBuffer = (a: Room, b: Room, buffer: number): boolean =>
  !(
    a.x + a.w + buffer <= b.x ||
    b.x + b.w + buffer <= a.x ||
    a.y + a.h + buffer <= b.y ||
    b.y + b.h + buffer <= a.y
  );

export const generateFloor = (input: GenerateFloorInput): DungeonFloor => {
  const { seed, width, height, targetRooms } = input;

  if (width < MIN_ROOM_SIZE || height < MIN_ROOM_SIZE) {
    throw new Error(
      `generateFloor: bounds ${width}x${height} too small for any room (min ${MIN_ROOM_SIZE}x${MIN_ROOM_SIZE})`,
    );
  }

  if (targetRooms <= 0) {
    return {
      seed,
      width,
      height,
      rooms: [],
      entryRoomIndex: -1,
      exitRoomIndex: -1,
    };
  }

  const rand = createPrng(seed);
  const rooms: Room[] = [];

  for (let i = 0; i < targetRooms; i++) {
    let placed = false;
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS_PER_ROOM; attempt++) {
      const w = randomInt(rand, MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, width));
      const h = randomInt(rand, MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, height));
      const x = randomInt(rand, 0, width - w);
      const y = randomInt(rand, 0, height - h);
      const candidate: Room = { x, y, w, h };

      const overlaps = rooms.some((r) =>
        overlapsWithBuffer(r, candidate, ROOM_BUFFER),
      );
      if (!overlaps) {
        rooms.push(candidate);
        placed = true;
        break;
      }
    }
    // If we couldn't place after the attempt budget, accept fewer rooms.
    if (!placed) break;
  }

  const entryRoomIndex = rooms.length > 0 ? 0 : -1;
  const exitRoomIndex = rooms.length > 1 ? rooms.length - 1 : entryRoomIndex;

  return {
    seed,
    width,
    height,
    rooms,
    entryRoomIndex,
    exitRoomIndex,
  };
};
