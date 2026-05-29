export type EndingId = "peace" | "war" | "ascension";

export interface EndingContext {
  imoogiDefeated: boolean;
  guardiansSummoned: number;
  villageReputation: number;
  choseWar: boolean;
}

export const REQUIRED_GUARDIANS_FOR_ASCENSION = 4;
export const ASCENSION_REPUTATION_THRESHOLD = 50;

// 엔딩 분기: war > ascension > peace 순서로 판정
export const determineEnding = (ctx: EndingContext): EndingId => {
  if (ctx.choseWar) {
    return "war";
  }

  if (
    ctx.imoogiDefeated &&
    ctx.guardiansSummoned >= REQUIRED_GUARDIANS_FOR_ASCENSION &&
    ctx.villageReputation >= ASCENSION_REPUTATION_THRESHOLD
  ) {
    return "ascension";
  }

  return "peace";
};
