export type Season = "spring" | "summer" | "autumn" | "winter";

export interface FestivalEvent {
  readonly id: string;
  readonly nameKey: string;
  readonly season: Season;
  readonly dayOfSeason: number;
  readonly durationDays: number;
}

export interface UpcomingFestivalResult {
  readonly festival: FestivalEvent;
  readonly daysUntil: number;
}

export const FESTIVALS: ReadonlyArray<FestivalEvent> = [
  {
    id: "festival-cherry-blossom",
    nameKey: "festival.cherryBlossom",
    season: "spring",
    dayOfSeason: 5,
    durationDays: 3,
  },
  {
    id: "festival-dano",
    nameKey: "festival.dano",
    season: "summer",
    dayOfSeason: 5,
    durationDays: 1,
  },
  {
    id: "festival-chuseok",
    nameKey: "festival.chuseok",
    season: "autumn",
    dayOfSeason: 15,
    durationDays: 2,
  },
  {
    id: "festival-kimjang",
    nameKey: "festival.kimjang",
    season: "winter",
    dayOfSeason: 1,
    durationDays: 1,
  },
];

const isWithin = (
  festival: FestivalEvent,
  season: Season,
  day: number,
): boolean =>
  festival.season === season &&
  day >= festival.dayOfSeason &&
  day < festival.dayOfSeason + festival.durationDays;

export const getActiveFestival = (
  season: Season,
  day: number,
): FestivalEvent | null => {
  for (const f of FESTIVALS) {
    if (isWithin(f, season, day)) return f;
  }
  return null;
};

export const getUpcomingFestival = (
  season: Season,
  day: number,
): UpcomingFestivalResult | null => {
  for (const f of FESTIVALS) {
    if (f.season !== season) continue;
    if (isWithin(f, season, day)) {
      return { festival: f, daysUntil: 0 };
    }
    if (day < f.dayOfSeason) {
      return { festival: f, daysUntil: f.dayOfSeason - day };
    }
  }
  return null;
};
