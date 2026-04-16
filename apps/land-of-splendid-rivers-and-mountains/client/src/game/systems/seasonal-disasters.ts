export type Season = "spring" | "summer" | "autumn" | "winter";

export type DisasterType =
  | "monsoon_flood"
  | "drought"
  | "typhoon"
  | "blizzard"
  | "wildfire";

export interface DisasterEvent {
  readonly id: string;
  readonly nameKey: string;
  readonly type: DisasterType;
  readonly seasons: ReadonlyArray<Season>;
  readonly probability: number;
  readonly durationDays: number;
}

// 각 재해는 발생 계절·일일 발생 확률을 가진다.
// 여러 재해가 한 계절에 해당할 수 있으며, rollDisasterForDay 는 id 순으로
// 순차 구간 할당을 통해 결정론적으로 하나를 고른다.
export const DISASTERS: ReadonlyArray<DisasterEvent> = [
  {
    id: "disaster-blizzard",
    nameKey: "disaster.blizzard",
    type: "blizzard",
    seasons: ["winter"],
    probability: 0.08,
    durationDays: 2,
  },
  {
    id: "disaster-drought",
    nameKey: "disaster.drought",
    type: "drought",
    seasons: ["summer"],
    probability: 0.03,
    durationDays: 5,
  },
  {
    id: "disaster-monsoon-flood",
    nameKey: "disaster.monsoonFlood",
    type: "monsoon_flood",
    seasons: ["summer"],
    probability: 0.05,
    durationDays: 3,
  },
  {
    id: "disaster-typhoon",
    nameKey: "disaster.typhoon",
    type: "typhoon",
    seasons: ["autumn"],
    probability: 0.04,
    durationDays: 2,
  },
  {
    id: "disaster-wildfire",
    nameKey: "disaster.wildfire",
    type: "wildfire",
    seasons: ["spring"],
    probability: 0.02,
    durationDays: 3,
  },
];

export const getDisastersForSeason = (
  season: Season,
): ReadonlyArray<DisasterEvent> =>
  DISASTERS.filter((d) => d.seasons.includes(season))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

export const rollDisasterForDay = (
  season: Season,
  randomValue: number,
): DisasterEvent | null => {
  const candidates = getDisastersForSeason(season);
  let acc = 0;
  for (const d of candidates) {
    acc += d.probability;
    if (randomValue < acc) return d;
  }
  return null;
};
