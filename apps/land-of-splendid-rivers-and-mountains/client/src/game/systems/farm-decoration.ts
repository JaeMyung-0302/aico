export interface DecorationItem {
  readonly id: string;
  readonly nameKey: string;
  readonly w: number;
  readonly h: number;
}

export interface PlacedDecoration {
  readonly instanceId: string;
  readonly itemId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly w: number;
  readonly h: number;
}

export interface ReservedTile {
  readonly x: number;
  readonly y: number;
}

export interface FarmLayout {
  readonly width: number;
  readonly height: number;
  readonly placements: ReadonlyArray<PlacedDecoration>;
}

export interface PlacementCheckResult {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const rectsOverlap = (a: Rect, b: Rect): boolean =>
  !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );

const tileInRect = (tile: ReservedTile, rect: Rect): boolean =>
  tile.x >= rect.x &&
  tile.x < rect.x + rect.w &&
  tile.y >= rect.y &&
  tile.y < rect.y + rect.h;

const placementToRect = (p: PlacedDecoration): Rect => ({
  x: p.tileX,
  y: p.tileY,
  w: p.w,
  h: p.h,
});

export const createLayout = (input: {
  readonly width: number;
  readonly height: number;
}): FarmLayout => {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error(
      `createLayout: width/height must be > 0, got ${input.width}x${input.height}`,
    );
  }
  return { width: input.width, height: input.height, placements: [] };
};

export const canPlace = (
  layout: FarmLayout,
  item: DecorationItem,
  tileX: number,
  tileY: number,
  reserved: ReadonlyArray<ReservedTile>,
): PlacementCheckResult => {
  const reasons: string[] = [];
  const footprint: Rect = { x: tileX, y: tileY, w: item.w, h: item.h };

  if (
    tileX < 0 ||
    tileY < 0 ||
    tileX + item.w > layout.width ||
    tileY + item.h > layout.height
  ) {
    reasons.push("outOfBounds");
  }

  for (const p of layout.placements) {
    if (rectsOverlap(footprint, placementToRect(p))) {
      reasons.push("overlap");
      break;
    }
  }

  for (const t of reserved) {
    if (tileInRect(t, footprint)) {
      reasons.push("reservedTile");
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
};

export const placeDecoration = (
  layout: FarmLayout,
  item: DecorationItem,
  instanceId: string,
  tileX: number,
  tileY: number,
): FarmLayout => {
  if (layout.placements.some((p) => p.instanceId === instanceId)) {
    throw new Error(`placeDecoration: duplicate instanceId ${instanceId}`);
  }
  const check = canPlace(layout, item, tileX, tileY, []);
  if (!check.ok) {
    throw new Error(`placeDecoration: rejected (${check.reasons.join(", ")})`);
  }
  const placement: PlacedDecoration = {
    instanceId,
    itemId: item.id,
    tileX,
    tileY,
    w: item.w,
    h: item.h,
  };
  return { ...layout, placements: [...layout.placements, placement] };
};

export const removeDecoration = (
  layout: FarmLayout,
  instanceId: string,
): FarmLayout => ({
  ...layout,
  placements: layout.placements.filter((p) => p.instanceId !== instanceId),
});

export const findAt = (
  layout: FarmLayout,
  tileX: number,
  tileY: number,
): PlacedDecoration | null => {
  for (const p of layout.placements) {
    if (
      tileX >= p.tileX &&
      tileX < p.tileX + p.w &&
      tileY >= p.tileY &&
      tileY < p.tileY + p.h
    ) {
      return p;
    }
  }
  return null;
};
