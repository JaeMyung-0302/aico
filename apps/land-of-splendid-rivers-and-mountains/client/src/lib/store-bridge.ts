import type {
  Season,
  Weather,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "./event-bus";
import { useGameStore } from "@/stores/useGameStore";

let cleanup: (() => void) | null = null;

const onTick = ({ timeOfDay }: { timeOfDay: number }) => {
  const state = useGameStore.getState();
  if (state.timeOfDay === timeOfDay) return;
  state.setTime(state.day, state.season, state.year, timeOfDay);
};

const onDayEnd = ({
  day,
  season,
  year,
}: {
  day: number;
  season: Season;
  year: number;
}) => {
  const state = useGameStore.getState();
  state.setTime(day, season, year, state.timeOfDay);
};

const onSeasonChange = ({ season, year }: { season: Season; year: number }) => {
  const state = useGameStore.getState();
  state.setTime(state.day, season, year, state.timeOfDay);
};

const onEnergyChanged = ({
  current,
  max,
}: {
  current: number;
  max: number;
}) => {
  const state = useGameStore.getState();
  if (state.energy !== current) state.setEnergy(current);
  if (state.maxEnergy !== max) useGameStore.setState({ maxEnergy: max });
};

const onGoldChanged = ({ total }: { total: number }) => {
  const state = useGameStore.getState();
  if (state.gold !== total) state.setGold(total);
};

const onWeatherChanged = ({ weather }: { weather: Weather }) => {
  const state = useGameStore.getState();
  if (state.weather !== weather) state.setWeather(weather);
};

const onNpcRelationChanged = ({
  npcId,
  newValue,
}: {
  npcId: string;
  newValue: number;
}) => {
  const state = useGameStore.getState();
  if (state.npcRelations[npcId] !== newValue)
    state.setNpcRelation(npcId, newValue);
};

const onPlayerMoved = ({
  scene,
  tileX,
  tileY,
}: {
  scene: string;
  tileX: number;
  tileY: number;
}) => {
  const state = useGameStore.getState();
  if (
    state.currentScene !== scene ||
    state.playerTileX !== tileX ||
    state.playerTileY !== tileY
  ) {
    state.setPlayerPosition(scene, tileX, tileY);
  }
};

const onUiToggle = ({ panel }: { panel: "inventory" | "journal" | "menu" }) => {
  useGameStore.getState().togglePanel(panel);
};

const onReputationThreshold = () => {
  const state = useGameStore.getState();
  if (!state.unlockedIsland) state.setUnlockedIsland(true);
};

export const initStoreBridge = (): void => {
  if (cleanup) return;

  eventBus.on("time:tick", onTick);
  eventBus.on("time:dayEnd", onDayEnd);
  eventBus.on("time:seasonChange", onSeasonChange);
  eventBus.on("energy:changed", onEnergyChanged);
  eventBus.on("gold:changed", onGoldChanged);
  eventBus.on("weather:changed", onWeatherChanged);
  eventBus.on("npc:relationChanged", onNpcRelationChanged);
  eventBus.on("player:moved", onPlayerMoved);
  eventBus.on("ui:toggle", onUiToggle);
  eventBus.on("reputation:thresholdReached", onReputationThreshold);

  cleanup = () => {
    eventBus.off("time:tick", onTick);
    eventBus.off("time:dayEnd", onDayEnd);
    eventBus.off("time:seasonChange", onSeasonChange);
    eventBus.off("energy:changed", onEnergyChanged);
    eventBus.off("gold:changed", onGoldChanged);
    eventBus.off("weather:changed", onWeatherChanged);
    eventBus.off("npc:relationChanged", onNpcRelationChanged);
    eventBus.off("player:moved", onPlayerMoved);
    eventBus.off("ui:toggle", onUiToggle);
    eventBus.off("reputation:thresholdReached", onReputationThreshold);
    cleanup = null;
  };
};

export const destroyStoreBridge = (): void => {
  cleanup?.();
};
