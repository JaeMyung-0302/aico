export interface Child {
  readonly id: string;
  readonly name: string;
  readonly birthDay: number;
}

export interface FamilyState {
  readonly children: ReadonlyArray<Child>;
  readonly lastChildBornDay: number | null;
}

// Marriage status surface this module needs. Kept structural so it lines up
// with the marriage module on its branch without a hard import dependency.
interface MarriageLike {
  readonly status: "single" | "dating" | "engaged" | "married";
}

export interface ChildEligibilityResult {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export const MIN_DAYS_BETWEEN_CHILDREN = 365;

export const createFamilyState = (): FamilyState => ({
  children: [],
  lastChildBornDay: null,
});

export const addChild = (family: FamilyState, child: Child): FamilyState => {
  if (family.children.some((c) => c.id === child.id)) {
    throw new Error(`addChild: duplicate child id ${child.id}`);
  }
  return {
    children: [...family.children, child],
    lastChildBornDay: child.birthDay,
  };
};

export const getChildAgeInDays = (child: Child, currentDay: number): number =>
  currentDay >= child.birthDay ? currentDay - child.birthDay : 0;

export const canHaveAnotherChild = (
  marriage: MarriageLike,
  family: FamilyState,
  currentDay: number,
): ChildEligibilityResult => {
  const reasons: string[] = [];

  if (marriage.status !== "married") {
    reasons.push("notMarried");
  }

  if (
    family.lastChildBornDay !== null &&
    currentDay - family.lastChildBornDay < MIN_DAYS_BETWEEN_CHILDREN
  ) {
    reasons.push("cooldownActive");
  }

  return { ok: reasons.length === 0, reasons };
};
