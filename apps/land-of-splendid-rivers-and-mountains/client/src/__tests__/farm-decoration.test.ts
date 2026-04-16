import { describe, it, expect } from "vitest";
import {
  createLayout,
  canPlace,
  placeDecoration,
  removeDecoration,
  findAt,
  type DecorationItem,
  type PlacedDecoration,
  type FarmLayout,
} from "../game/systems/farm-decoration";

const item = (w: number, h: number, id = "deco-flower"): DecorationItem => ({
  id,
  nameKey: `deco.${id}`,
  w,
  h,
});

const emptyLayout = (): FarmLayout => createLayout({ width: 20, height: 15 });

describe("createLayout", () => {
  it("returns an empty layout with the given dimensions", () => {
    const l = createLayout({ width: 30, height: 20 });
    expect(l.width).toBe(30);
    expect(l.height).toBe(20);
    expect(l.placements).toEqual([]);
  });

  it("throws on non-positive bounds", () => {
    expect(() => createLayout({ width: 0, height: 10 })).toThrow();
    expect(() => createLayout({ width: 10, height: -5 })).toThrow();
  });
});

describe("canPlace — bounds", () => {
  it("ok when item fits entirely within the layout", () => {
    const r = canPlace(emptyLayout(), item(2, 2), 5, 5, []);
    expect(r.ok).toBe(true);
  });

  it("flags outOfBounds when placement extends past the right edge", () => {
    const r = canPlace(emptyLayout(), item(3, 1), 18, 0, []);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("outOfBounds");
  });

  it("flags outOfBounds when placement extends past the bottom edge", () => {
    const r = canPlace(emptyLayout(), item(1, 3), 0, 13, []);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("outOfBounds");
  });

  it("flags outOfBounds on negative tileX or tileY", () => {
    const layout = emptyLayout();
    expect(canPlace(layout, item(1, 1), -1, 0, []).reasons).toContain(
      "outOfBounds",
    );
    expect(canPlace(layout, item(1, 1), 0, -1, []).reasons).toContain(
      "outOfBounds",
    );
  });
});

describe("canPlace — overlap with existing placements", () => {
  it("flags overlap when a new placement collides with a prior one", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(2, 2), "first", 5, 5);
    const r = canPlace(layout, item(2, 2), 6, 5, []);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("overlap");
  });

  it("adjacent placements do not overlap", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(2, 2), "first", 5, 5);
    const r = canPlace(layout, item(2, 2), 7, 5, []);
    expect(r.ok).toBe(true);
  });
});

describe("canPlace — reserved tiles (building plots etc.)", () => {
  it("flags reservedTile when the footprint overlaps a reserved cell", () => {
    const reserved = [{ x: 6, y: 6 }];
    const r = canPlace(emptyLayout(), item(2, 2), 5, 5, reserved);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("reservedTile");
  });

  it("ignores reserved cells outside the footprint", () => {
    const reserved = [{ x: 0, y: 0 }];
    const r = canPlace(emptyLayout(), item(2, 2), 5, 5, reserved);
    expect(r.ok).toBe(true);
  });
});

describe("placeDecoration", () => {
  it("appends a new placement with the given instanceId", () => {
    const layout = placeDecoration(emptyLayout(), item(2, 2), "inst-1", 3, 4);
    expect(layout.placements.length).toBe(1);
    expect(layout.placements[0]!.instanceId).toBe("inst-1");
    expect(layout.placements[0]!.tileX).toBe(3);
    expect(layout.placements[0]!.tileY).toBe(4);
  });

  it("throws when canPlace fails (out of bounds)", () => {
    expect(() =>
      placeDecoration(emptyLayout(), item(30, 30), "huge", 0, 0),
    ).toThrow();
  });

  it("throws on duplicate instanceId", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(1, 1), "dup", 0, 0);
    expect(() => placeDecoration(layout, item(1, 1), "dup", 5, 5)).toThrow();
  });
});

describe("removeDecoration", () => {
  it("removes the placement with the given instanceId", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(1, 1), "a", 1, 1);
    layout = placeDecoration(layout, item(1, 1), "b", 3, 3);
    const next = removeDecoration(layout, "a");
    expect(next.placements.length).toBe(1);
    expect(next.placements[0]!.instanceId).toBe("b");
  });

  it("no-ops when the instanceId is not present", () => {
    const layout = emptyLayout();
    expect(removeDecoration(layout, "ghost")).toEqual(layout);
  });
});

describe("findAt", () => {
  it("returns a placement that covers the given tile", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(2, 2, "tree"), "tree-1", 5, 5);
    const found = findAt(layout, 6, 6);
    expect(found?.instanceId).toBe("tree-1");
  });

  it("returns null for an empty tile", () => {
    expect(findAt(emptyLayout(), 0, 0)).toBeNull();
  });
});

describe("purity", () => {
  it("placeDecoration does not mutate input layout", () => {
    const layout = emptyLayout();
    const snapshot = structuredClone(layout);
    placeDecoration(layout, item(1, 1), "x", 0, 0);
    expect(layout).toEqual(snapshot);
  });

  it("removeDecoration does not mutate input layout", () => {
    let layout = emptyLayout();
    layout = placeDecoration(layout, item(1, 1), "x", 0, 0);
    const snapshot = structuredClone(layout);
    removeDecoration(layout, "x");
    expect(layout).toEqual(snapshot);
  });
});

describe("type sanity", () => {
  it("PlacedDecoration matches expected shape", () => {
    const l = placeDecoration(emptyLayout(), item(1, 1), "x", 0, 0);
    const p: PlacedDecoration = l.placements[0]!;
    expect(p.itemId).toBe("deco-flower");
  });
});
