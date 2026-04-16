import { create } from "zustand";
import type {
  Season,
  Weather,
  InventorySlot,
  EquippedTools,
  BuildingState,
  AnimalState,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";

interface GameState {
  readonly gold: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly day: number;
  readonly season: Season;
  readonly year: number;
  readonly timeOfDay: number;
  readonly weather: Weather;
  readonly inventory: ReadonlyArray<InventorySlot | null>;
  readonly equippedTools: EquippedTools;
  readonly npcRelations: Readonly<Record<string, number>>;
  readonly fermentationSlots: ReadonlyArray<{
    slotIndex: number;
    recipeId: string;
    elapsed: number;
    required: number;
  }>;
  readonly buildings: ReadonlyArray<BuildingState>;
  readonly animals: ReadonlyArray<AnimalState>;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly playerAttack: number;
  readonly playerDefense: number;
  readonly playerLevel: number;
  readonly playerExp: number;
  readonly dungeonFloor: number;
  readonly maxDungeonFloor: number;
  readonly fishingState: "idle" | "casting" | "waiting" | "reeling";
  readonly fishingDifficulty: number;
  readonly activeQuests: ReadonlyArray<string>;
  readonly completedQuests: ReadonlyArray<string>;
  readonly questProgress: Readonly<Record<string, ReadonlyArray<number>>>;
  readonly currentScene: string;
  readonly playerTileX: number;
  readonly playerTileY: number;
  readonly activePanel: "inventory" | "journal" | "menu" | null;
  readonly dialogOpen: boolean;
  readonly reputation: number;
  readonly unlockedIsland: boolean;
}

interface GameActions {
  setGold: (gold: number) => void;
  setEnergy: (energy: number) => void;
  setTime: (
    day: number,
    season: Season,
    year: number,
    timeOfDay: number,
  ) => void;
  setInventory: (inventory: ReadonlyArray<InventorySlot | null>) => void;
  setEquippedTools: (tools: EquippedTools) => void;
  setWeather: (weather: Weather) => void;
  setNpcRelation: (npcId: string, value: number) => void;
  setFermentationSlots: (
    slots: ReadonlyArray<{
      slotIndex: number;
      recipeId: string;
      elapsed: number;
      required: number;
    }>,
  ) => void;
  setBuildings: (buildings: ReadonlyArray<BuildingState>) => void;
  setAnimals: (animals: ReadonlyArray<AnimalState>) => void;
  setPlayerHp: (
    hp: number,
    maxHp: number,
    attack?: number,
    defense?: number,
  ) => void;
  setPlayerLevel: (level: number, exp: number) => void;
  setDungeonFloor: (floor: number, maxFloor?: number) => void;
  setFishingState: (
    state: "idle" | "casting" | "waiting" | "reeling",
    difficulty?: number,
  ) => void;
  setQuests: (
    active: ReadonlyArray<string>,
    completed: ReadonlyArray<string>,
    progress: Readonly<Record<string, ReadonlyArray<number>>>,
  ) => void;
  togglePanel: (panel: "inventory" | "journal" | "menu") => void;
  setPlayerPosition: (scene: string, tileX: number, tileY: number) => void;
  setDialogOpen: (open: boolean) => void;
  setReputation: (reputation: number) => void;
  setUnlockedIsland: (unlocked: boolean) => void;
  reset: () => void;
}

const initialState: GameState = {
  gold: 500,
  energy: GAME_CONSTANTS.MAX_ENERGY_BASE,
  maxEnergy: GAME_CONSTANTS.MAX_ENERGY_BASE,
  day: 1,
  season: "spring",
  year: 1,
  timeOfDay: GAME_CONSTANTS.DAY_START_MINUTE,
  weather: "clear",
  inventory: [],
  equippedTools: { current: null },
  npcRelations: {},
  fermentationSlots: [],
  buildings: [],
  animals: [],
  playerHp: 50,
  playerMaxHp: 50,
  playerAttack: 5,
  playerDefense: 2,
  playerLevel: 1,
  playerExp: 0,
  dungeonFloor: 0,
  maxDungeonFloor: 0,
  fishingState: "idle",
  fishingDifficulty: 0,
  activeQuests: [],
  completedQuests: [],
  questProgress: {},
  currentScene: "FarmScene",
  playerTileX: 0,
  playerTileY: 0,
  activePanel: null,
  dialogOpen: false,
  reputation: 0,
  unlockedIsland: false,
};

export const useGameStore = create<GameState & GameActions>()((set) => ({
  ...initialState,

  setGold: (gold) => set({ gold }),

  setEnergy: (energy) => set({ energy }),

  setTime: (day, season, year, timeOfDay) =>
    set({ day, season, year, timeOfDay }),

  setInventory: (inventory) => set({ inventory }),

  setEquippedTools: (equippedTools) => set({ equippedTools }),

  setWeather: (weather) => set({ weather }),

  setNpcRelation: (npcId, value) =>
    set((state) => ({
      npcRelations: { ...state.npcRelations, [npcId]: value },
    })),

  setFermentationSlots: (fermentationSlots) => set({ fermentationSlots }),

  setBuildings: (buildings) => set({ buildings }),

  setAnimals: (animals) => set({ animals }),

  setPlayerHp: (playerHp, playerMaxHp, playerAttack?, playerDefense?) =>
    set((_state) => ({
      playerHp,
      playerMaxHp,
      ...(playerAttack !== undefined ? { playerAttack } : {}),
      ...(playerDefense !== undefined ? { playerDefense } : {}),
    })),

  setPlayerLevel: (playerLevel, playerExp) => set({ playerLevel, playerExp }),

  setDungeonFloor: (dungeonFloor, maxDungeonFloor?) =>
    set((_state) => ({
      dungeonFloor,
      ...(maxDungeonFloor !== undefined ? { maxDungeonFloor } : {}),
    })),

  setFishingState: (fishingState, fishingDifficulty = 0) =>
    set({ fishingState, fishingDifficulty }),

  setQuests: (activeQuests, completedQuests, questProgress) =>
    set({ activeQuests, completedQuests, questProgress }),

  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),

  setPlayerPosition: (currentScene, playerTileX, playerTileY) =>
    set({ currentScene, playerTileX, playerTileY }),

  setDialogOpen: (dialogOpen) => set({ dialogOpen }),

  setReputation: (reputation) => set({ reputation }),

  setUnlockedIsland: (unlockedIsland) => set({ unlockedIsland }),

  reset: () => set(initialState),
}));
