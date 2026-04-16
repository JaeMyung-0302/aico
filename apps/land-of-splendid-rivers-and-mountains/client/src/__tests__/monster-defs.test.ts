import { describe, it, expect } from "vitest";
import { getFallbackMonsterDef } from "../game/systems/monster-defs";
import type { MonsterDefinition } from "@land-of-splendid-rivers-and-mountains/shared";

const makeDef = (id: string): MonsterDefinition => ({
  id,
  nameKey: `monster.${id}`,
  hp: 10,
  attack: 1,
  defense: 0,
  speed: 50,
  drops: [],
  expReward: 1,
});

describe("getFallbackMonsterDef", () => {
  it("returns the first value of a populated map", () => {
    const defs = new Map<string, MonsterDefinition>([
      ["a", makeDef("a")],
      ["b", makeDef("b")],
    ]);
    const first = getFallbackMonsterDef(defs);
    expect(first.id).toBe("a");
  });

  it("throws a descriptive error on an empty map", () => {
    const defs = new Map<string, MonsterDefinition>();
    expect(() => getFallbackMonsterDef(defs)).toThrow(
      /no monster definitions/i,
    );
  });

  it("accepts a ReadonlyMap-typed input (type-check via usage)", () => {
    const defs: ReadonlyMap<string, MonsterDefinition> = new Map([
      ["x", makeDef("x")],
    ]);
    expect(getFallbackMonsterDef(defs).id).toBe("x");
  });

  it("does not mutate the input map", () => {
    const defs = new Map<string, MonsterDefinition>([["a", makeDef("a")]]);
    const sizeBefore = defs.size;
    getFallbackMonsterDef(defs);
    expect(defs.size).toBe(sizeBefore);
  });
});
