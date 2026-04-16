import { describe, it, expect } from "vitest";
import {
  MIN_DAMAGE,
  MELEE_RANGE_RESOLVER,
  BREATH_RANGE_MIN_RESOLVER,
  resolveImoogiAction,
  type ImoogiActionId,
  type ResolveContext,
} from "../game/systems/imoogi-action-resolver";

const ctx = (overrides: Partial<ResolveContext> = {}): ResolveContext => ({
  playerHp: 100,
  playerMaxHp: 100,
  playerDefense: 5,
  bossHp: 500,
  bossMaxHp: 500,
  bossAttack: 30,
  playerDistance: 100,
  ...overrides,
});

describe("resolver constants", () => {
  it("MIN_DAMAGE is at least 1", () => {
    expect(MIN_DAMAGE).toBeGreaterThanOrEqual(1);
  });

  it("MELEE_RANGE_RESOLVER and BREATH_RANGE_MIN_RESOLVER are positive", () => {
    expect(MELEE_RANGE_RESOLVER).toBeGreaterThan(0);
    expect(BREATH_RANGE_MIN_RESOLVER).toBeGreaterThan(0);
    expect(BREATH_RANGE_MIN_RESOLVER).toBeGreaterThan(MELEE_RANGE_RESOLVER);
  });
});

describe("resolveImoogiAction — idle & roar", () => {
  it("idle deals zero damage and applies no effects", () => {
    const r = resolveImoogiAction("idle", ctx());
    expect(r.damageToPlayer).toBe(0);
    expect(r.bossHpDelta).toBe(0);
    expect(r.effects).toEqual([]);
  });

  it("enrage_roar deals zero damage but applies stun effect", () => {
    const r = resolveImoogiAction("enrage_roar", ctx());
    expect(r.damageToPlayer).toBe(0);
    expect(r.effects).toContain("stun");
  });
});

describe("resolveImoogiAction — melee", () => {
  it("deals damage when player is within MELEE_RANGE_RESOLVER", () => {
    const r = resolveImoogiAction(
      "melee",
      ctx({ playerDistance: MELEE_RANGE_RESOLVER - 10 }),
    );
    expect(r.damageToPlayer).toBeGreaterThan(0);
  });

  it("misses (deals 0) when player is out of melee range", () => {
    const r = resolveImoogiAction(
      "melee",
      ctx({ playerDistance: MELEE_RANGE_RESOLVER + 10 }),
    );
    expect(r.damageToPlayer).toBe(0);
    expect(r.effects).toContain("missed");
  });

  it("damage clamps to MIN_DAMAGE even with high defense", () => {
    const r = resolveImoogiAction(
      "melee",
      ctx({
        playerDistance: 50,
        playerDefense: 999,
        bossAttack: 10,
      }),
    );
    expect(r.damageToPlayer).toBe(MIN_DAMAGE);
  });
});

describe("resolveImoogiAction — breath", () => {
  it("deals damage when player is at or beyond BREATH_RANGE_MIN_RESOLVER", () => {
    const r = resolveImoogiAction(
      "breath",
      ctx({ playerDistance: BREATH_RANGE_MIN_RESOLVER + 50 }),
    );
    expect(r.damageToPlayer).toBeGreaterThan(0);
  });

  it("misses when player is too close to be hit by breath", () => {
    const r = resolveImoogiAction("breath", ctx({ playerDistance: 20 }));
    expect(r.damageToPlayer).toBe(0);
    expect(r.effects).toContain("missed");
  });

  it("breath hits harder than melee at similar attack values", () => {
    const meleeDmg = resolveImoogiAction(
      "melee",
      ctx({ playerDistance: 50 }),
    ).damageToPlayer;
    const breathDmg = resolveImoogiAction(
      "breath",
      ctx({ playerDistance: BREATH_RANGE_MIN_RESOLVER + 50 }),
    ).damageToPlayer;
    expect(breathDmg).toBeGreaterThan(meleeDmg);
  });
});

describe("resolveImoogiAction — tail_sweep", () => {
  it("deals AoE damage regardless of close distance", () => {
    const r = resolveImoogiAction("tail_sweep", ctx({ playerDistance: 40 }));
    expect(r.damageToPlayer).toBeGreaterThan(0);
  });

  it("deals damage at mid-range as well", () => {
    const r = resolveImoogiAction("tail_sweep", ctx({ playerDistance: 250 }));
    expect(r.damageToPlayer).toBeGreaterThan(0);
  });

  it("cannot hit beyond a reasonable AoE radius", () => {
    const r = resolveImoogiAction("tail_sweep", ctx({ playerDistance: 9999 }));
    expect(r.damageToPlayer).toBe(0);
  });
});

describe("resolveImoogiAction — damage formula", () => {
  it("damage uses max(MIN_DAMAGE, bossAttack - playerDefense)", () => {
    const r = resolveImoogiAction(
      "melee",
      ctx({ bossAttack: 50, playerDefense: 10, playerDistance: 50 }),
    );
    expect(r.damageToPlayer).toBe(50 - 10);
  });

  it("bossHpDelta is always 0 for boss actions (no self-harm)", () => {
    const r = resolveImoogiAction("melee", ctx({ playerDistance: 50 }));
    expect(r.bossHpDelta).toBe(0);
  });
});

describe("resolveImoogiAction — purity & unknown actions", () => {
  it("returns no-op for an unknown action id (safe fallback)", () => {
    const r = resolveImoogiAction("not_a_real_action" as ImoogiActionId, ctx());
    expect(r.damageToPlayer).toBe(0);
    expect(r.bossHpDelta).toBe(0);
    expect(r.effects).toEqual([]);
  });

  it("does not mutate input context", () => {
    const c = ctx();
    const snapshot = structuredClone(c);
    resolveImoogiAction("melee", c);
    expect(c).toEqual(snapshot);
  });
});
