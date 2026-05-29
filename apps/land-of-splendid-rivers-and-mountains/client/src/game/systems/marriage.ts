export type MarriageStatus = "single" | "dating" | "engaged" | "married";

export interface MarriageState {
  readonly status: MarriageStatus;
  readonly partnerId: string | null;
  readonly engagedAtDay: number | null;
  readonly marriedAtDay: number | null;
}

export interface NPCRelationContext {
  readonly npcId: string;
  readonly relation: number;
  readonly isEligible: boolean;
}

export interface PlayerMarriageContext {
  readonly state: MarriageState;
  readonly inventory: ReadonlyArray<string>;
  readonly npcs: ReadonlyArray<NPCRelationContext>;
}

export interface ProposalCheckResult {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export const MIN_RELATION_TO_PROPOSE = 8;
export const WEDDING_RING_ITEM_ID = "item-wedding-ring";

export const createMarriageState = (): MarriageState => ({
  status: "single",
  partnerId: null,
  engagedAtDay: null,
  marriedAtDay: null,
});

const isCommitted = (state: MarriageState): boolean =>
  state.status === "engaged" || state.status === "married";

export const canProposeToNpc = (
  npcId: string,
  ctx: PlayerMarriageContext,
): ProposalCheckResult => {
  const reasons: string[] = [];

  if (isCommitted(ctx.state)) {
    reasons.push("alreadyCommitted");
  }

  const target = ctx.npcs.find((n) => n.npcId === npcId);
  if (!target) {
    reasons.push("unknownNpc");
  } else {
    if (!target.isEligible) reasons.push("ineligible");
    if (target.relation < MIN_RELATION_TO_PROPOSE) reasons.push("lowRelation");
  }

  if (!ctx.inventory.includes(WEDDING_RING_ITEM_ID)) {
    reasons.push("missingRing");
  }

  return { ok: reasons.length === 0, reasons };
};

export const listEligibleForProposal = (
  ctx: PlayerMarriageContext,
): ReadonlyArray<string> =>
  ctx.npcs.filter((n) => canProposeToNpc(n.npcId, ctx).ok).map((n) => n.npcId);

export const acceptProposal = (
  state: MarriageState,
  npcId: string,
  currentDay: number,
): MarriageState => {
  if (isCommitted(state)) {
    throw new Error(
      `acceptProposal: cannot propose while status=${state.status}`,
    );
  }
  return {
    status: "engaged",
    partnerId: npcId,
    engagedAtDay: currentDay,
    marriedAtDay: null,
  };
};

export const finalizeWedding = (
  state: MarriageState,
  currentDay: number,
): MarriageState => {
  if (state.status !== "engaged") {
    throw new Error(
      `finalizeWedding: requires engaged status, got ${state.status}`,
    );
  }
  return {
    status: "married",
    partnerId: state.partnerId,
    engagedAtDay: state.engagedAtDay,
    marriedAtDay: currentDay,
  };
};
