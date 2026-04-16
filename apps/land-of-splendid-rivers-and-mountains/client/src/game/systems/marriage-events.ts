export type MarriageStatus = "single" | "dating" | "engaged" | "married";

// Structural mirror of marriage.ts (sibling branch) — keeps this module
// independently typeable on its own feature branch. Fields match exactly
// so the two converge on merge without a rename.
export interface MarriageLike {
  readonly status: MarriageStatus;
  readonly partnerId: string | null;
  readonly engagedAtDay: number | null;
  readonly marriedAtDay: number | null;
}

export type MarriageEventType = "engagement" | "wedding";

export interface MarriageEvent {
  readonly type: MarriageEventType;
  readonly partnerId: string;
  readonly dayOfEvent: number;
}

export const DEFAULT_DAYS_PER_YEAR = 112; // 4 seasons × 28 days

const isCommitted = (status: MarriageStatus): boolean =>
  status === "engaged" || status === "married";

export const detectTransitionEvents = (
  prev: MarriageLike,
  next: MarriageLike,
  currentDay: number,
): ReadonlyArray<MarriageEvent> => {
  const events: MarriageEvent[] = [];

  // single (or dating) → engaged
  if (
    !isCommitted(prev.status) &&
    next.status === "engaged" &&
    next.partnerId !== null
  ) {
    events.push({
      type: "engagement",
      partnerId: next.partnerId,
      dayOfEvent: currentDay,
    });
  }

  // engaged (or single) → married. We fold the single→married collapse
  // into "engagement + wedding" on the same tick so UI can schedule both.
  if (
    prev.status !== "married" &&
    next.status === "married" &&
    next.partnerId !== null
  ) {
    if (prev.status !== "engaged") {
      events.push({
        type: "engagement",
        partnerId: next.partnerId,
        dayOfEvent: currentDay,
      });
    }
    events.push({
      type: "wedding",
      partnerId: next.partnerId,
      dayOfEvent: currentDay,
    });
  }

  return events;
};

const validateDaysPerYear = (daysPerYear: number): void => {
  if (!Number.isFinite(daysPerYear) || daysPerYear <= 0) {
    throw new Error(
      `marriage-events: daysPerYear must be > 0, got ${daysPerYear}`,
    );
  }
};

export const isAnniversary = (
  marriedAtDay: number | null,
  currentDay: number,
  daysPerYear: number,
): boolean => {
  validateDaysPerYear(daysPerYear);
  if (marriedAtDay === null) return false;
  const elapsed = currentDay - marriedAtDay;
  if (elapsed <= 0) return false;
  return elapsed % daysPerYear === 0;
};

export const getAnniversaryCount = (
  marriedAtDay: number | null,
  currentDay: number,
  daysPerYear: number,
): number => {
  validateDaysPerYear(daysPerYear);
  if (marriedAtDay === null) return 0;
  const elapsed = currentDay - marriedAtDay;
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / daysPerYear);
};
