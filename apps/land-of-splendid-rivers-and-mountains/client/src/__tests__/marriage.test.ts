import { describe, it, expect } from "vitest";
import {
  MIN_RELATION_TO_PROPOSE,
  WEDDING_RING_ITEM_ID,
  createMarriageState,
  canProposeToNpc,
  listEligibleForProposal,
  acceptProposal,
  finalizeWedding,
  type MarriageState,
  type PlayerMarriageContext,
  type NPCRelationContext,
} from "../game/systems/marriage";

const npc = (
  id: string,
  relation: number,
  isEligible = true,
): NPCRelationContext => ({ npcId: id, relation, isEligible });

const ctx = (
  overrides: Partial<PlayerMarriageContext> = {},
): PlayerMarriageContext => ({
  state: createMarriageState(),
  inventory: [WEDDING_RING_ITEM_ID],
  npcs: [],
  ...overrides,
});

describe("marriage — constants", () => {
  it("exposes a sensible minimum relation threshold", () => {
    expect(MIN_RELATION_TO_PROPOSE).toBeGreaterThan(0);
    expect(MIN_RELATION_TO_PROPOSE).toBeLessThanOrEqual(10);
  });

  it("exposes the wedding ring item id", () => {
    expect(WEDDING_RING_ITEM_ID).toBe("item-wedding-ring");
  });
});

describe("createMarriageState", () => {
  it("starts single with no partner or timestamps", () => {
    const s = createMarriageState();
    expect(s.status).toBe("single");
    expect(s.partnerId).toBeNull();
    expect(s.engagedAtDay).toBeNull();
    expect(s.marriedAtDay).toBeNull();
  });

  it("returns a fresh object each call", () => {
    expect(createMarriageState()).not.toBe(createMarriageState());
  });
});

describe("canProposeToNpc", () => {
  it("allows a proposal when all conditions are met", () => {
    const c = ctx({
      npcs: [npc("npc-yeonhwa", MIN_RELATION_TO_PROPOSE)],
    });
    const r = canProposeToNpc("npc-yeonhwa", c);
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags unknownNpc when the npc is not in the list", () => {
    const r = canProposeToNpc("npc-missing", ctx());
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("unknownNpc");
  });

  it("flags ineligible when the NPC is marked as not eligible", () => {
    const r = canProposeToNpc(
      "npc-elder",
      ctx({ npcs: [npc("npc-elder", 10, false)] }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("ineligible");
  });

  it("flags lowRelation when below MIN_RELATION_TO_PROPOSE", () => {
    const r = canProposeToNpc(
      "npc-a",
      ctx({ npcs: [npc("npc-a", MIN_RELATION_TO_PROPOSE - 1)] }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("lowRelation");
  });

  it("flags missingRing when the ring is not in inventory", () => {
    const r = canProposeToNpc(
      "npc-a",
      ctx({
        inventory: [],
        npcs: [npc("npc-a", 10)],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("missingRing");
  });

  it("flags alreadyCommitted when already engaged", () => {
    const r = canProposeToNpc(
      "npc-a",
      ctx({
        state: {
          status: "engaged",
          partnerId: "npc-b",
          engagedAtDay: 10,
          marriedAtDay: null,
        },
        npcs: [npc("npc-a", 10)],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("alreadyCommitted");
  });

  it("flags alreadyCommitted when already married", () => {
    const r = canProposeToNpc(
      "npc-a",
      ctx({
        state: {
          status: "married",
          partnerId: "npc-b",
          engagedAtDay: 10,
          marriedAtDay: 20,
        },
        npcs: [npc("npc-a", 10)],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("alreadyCommitted");
  });

  it("aggregates multiple reasons", () => {
    const r = canProposeToNpc(
      "npc-a",
      ctx({
        inventory: [],
        npcs: [npc("npc-a", 1, false)],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("ineligible");
    expect(r.reasons).toContain("lowRelation");
    expect(r.reasons).toContain("missingRing");
  });
});

describe("listEligibleForProposal", () => {
  it("returns only NPCs passing canProposeToNpc", () => {
    const c = ctx({
      npcs: [
        npc("a", 10),
        npc("b", MIN_RELATION_TO_PROPOSE - 1),
        npc("c", 10, false),
        npc("d", MIN_RELATION_TO_PROPOSE),
      ],
    });
    const eligible = listEligibleForProposal(c);
    expect(eligible).toContain("a");
    expect(eligible).toContain("d");
    expect(eligible).not.toContain("b");
    expect(eligible).not.toContain("c");
  });

  it("returns empty when player is already engaged (alreadyCommitted blocks all)", () => {
    const c = ctx({
      state: {
        status: "engaged",
        partnerId: "x",
        engagedAtDay: 5,
        marriedAtDay: null,
      },
      npcs: [npc("a", 10), npc("b", 10)],
    });
    expect(listEligibleForProposal(c)).toEqual([]);
  });
});

describe("acceptProposal", () => {
  it("transitions single → engaged and records partner + engagedAtDay", () => {
    const next = acceptProposal(createMarriageState(), "npc-yeonhwa", 42);
    expect(next.status).toBe("engaged");
    expect(next.partnerId).toBe("npc-yeonhwa");
    expect(next.engagedAtDay).toBe(42);
    expect(next.marriedAtDay).toBeNull();
  });

  it("throws if state is already engaged", () => {
    const state: MarriageState = {
      status: "engaged",
      partnerId: "a",
      engagedAtDay: 1,
      marriedAtDay: null,
    };
    expect(() => acceptProposal(state, "b", 2)).toThrow();
  });

  it("throws if state is already married", () => {
    const state: MarriageState = {
      status: "married",
      partnerId: "a",
      engagedAtDay: 1,
      marriedAtDay: 5,
    };
    expect(() => acceptProposal(state, "b", 10)).toThrow();
  });
});

describe("finalizeWedding", () => {
  it("transitions engaged → married with marriedAtDay", () => {
    const engaged: MarriageState = {
      status: "engaged",
      partnerId: "npc-a",
      engagedAtDay: 10,
      marriedAtDay: null,
    };
    const next = finalizeWedding(engaged, 20);
    expect(next.status).toBe("married");
    expect(next.partnerId).toBe("npc-a");
    expect(next.engagedAtDay).toBe(10);
    expect(next.marriedAtDay).toBe(20);
  });

  it("throws if state is not engaged (single)", () => {
    expect(() => finalizeWedding(createMarriageState(), 5)).toThrow();
  });

  it("throws if state is already married", () => {
    const married: MarriageState = {
      status: "married",
      partnerId: "a",
      engagedAtDay: 1,
      marriedAtDay: 5,
    };
    expect(() => finalizeWedding(married, 10)).toThrow();
  });
});

describe("purity", () => {
  it("acceptProposal does not mutate input state", () => {
    const state = createMarriageState();
    const snapshot = { ...state };
    acceptProposal(state, "x", 1);
    expect(state).toEqual(snapshot);
  });

  it("finalizeWedding does not mutate input state", () => {
    const engaged: MarriageState = {
      status: "engaged",
      partnerId: "a",
      engagedAtDay: 1,
      marriedAtDay: null,
    };
    const snapshot = { ...engaged };
    finalizeWedding(engaged, 5);
    expect(engaged).toEqual(snapshot);
  });

  it("canProposeToNpc does not mutate input context", () => {
    const c = ctx({ npcs: [npc("a", 10)] });
    const snapshot = structuredClone(c);
    canProposeToNpc("a", c);
    expect(c).toEqual(snapshot);
  });
});
