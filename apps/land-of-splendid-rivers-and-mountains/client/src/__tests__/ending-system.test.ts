import { describe, it, expect } from "vitest";
import {
  determineEnding,
  REQUIRED_GUARDIANS_FOR_ASCENSION,
  ASCENSION_REPUTATION_THRESHOLD,
  type EndingContext,
  type EndingId,
} from "../game/systems/ending";

const makeCtx = (overrides: Partial<EndingContext> = {}): EndingContext => ({
  imoogiDefeated: false,
  guardiansSummoned: 0,
  villageReputation: 0,
  choseWar: false,
  ...overrides,
});

describe("ending system constants", () => {
  it("should export REQUIRED_GUARDIANS_FOR_ASCENSION as 4", () => {
    expect(REQUIRED_GUARDIANS_FOR_ASCENSION).toBe(4);
  });

  it("should export ASCENSION_REPUTATION_THRESHOLD as 50", () => {
    expect(ASCENSION_REPUTATION_THRESHOLD).toBe(50);
  });
});

describe("determineEnding - war priority", () => {
  it('should return "war" when choseWar is true regardless of other fields', () => {
    const ctx = makeCtx({
      choseWar: true,
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 100,
    });
    const result: EndingId = determineEnding(ctx);
    expect(result).toBe("war");
  });

  it('should return "war" when choseWar is true even with minimal context', () => {
    const ctx = makeCtx({ choseWar: true });
    expect(determineEnding(ctx)).toBe("war");
  });

  it('should return "war" when choseWar is true with negative reputation', () => {
    const ctx = makeCtx({ choseWar: true, villageReputation: -999 });
    expect(determineEnding(ctx)).toBe("war");
  });
});

describe("determineEnding - ascension conditions", () => {
  it('should return "ascension" when all ascension conditions are met', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 80,
    });
    expect(determineEnding(ctx)).toBe("ascension");
  });

  it('should return "ascension" at the exact boundary (guardians=4, reputation=50)', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 50,
    });
    expect(determineEnding(ctx)).toBe("ascension");
  });

  it('should return "ascension" with more than 4 guardians (if ever possible)', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 999,
    });
    expect(determineEnding(ctx)).toBe("ascension");
  });
});

describe("determineEnding - peace fallthrough", () => {
  it('should return "peace" when imoogi is not defeated', () => {
    const ctx = makeCtx({
      imoogiDefeated: false,
      guardiansSummoned: 4,
      villageReputation: 100,
    });
    expect(determineEnding(ctx)).toBe("peace");
  });

  it('should return "peace" when guardians < 4', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 3,
      villageReputation: 100,
    });
    expect(determineEnding(ctx)).toBe("peace");
  });

  it('should return "peace" when reputation is 49 (just below threshold)', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 49,
    });
    expect(determineEnding(ctx)).toBe("peace");
  });

  it('should return "peace" when reputation is negative', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: -10,
    });
    expect(determineEnding(ctx)).toBe("peace");
  });

  it('should return "peace" by default when nothing is set', () => {
    const ctx = makeCtx();
    expect(determineEnding(ctx)).toBe("peace");
  });

  it('should return "peace" when guardians is 0', () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 0,
      villageReputation: 100,
    });
    expect(determineEnding(ctx)).toBe("peace");
  });
});

describe("determineEnding - purity", () => {
  it("should not mutate the input context", () => {
    const ctx = makeCtx({
      imoogiDefeated: true,
      guardiansSummoned: 4,
      villageReputation: 50,
    });
    const snapshot = { ...ctx };
    determineEnding(ctx);
    expect(ctx).toEqual(snapshot);
  });
});
