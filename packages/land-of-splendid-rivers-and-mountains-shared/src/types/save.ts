export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow" | "storm" | "fog";

export interface FarmPlotState {
  readonly x: number;
  readonly y: number;
  readonly cropId: string | null;
  readonly growthDay: number;
  readonly watered: boolean;
  readonly fertilized: boolean;
}

export interface AnimalState {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly happiness: number;
  readonly fedToday: boolean;
  readonly producedToday: boolean;
}

export interface FermentationState {
  readonly slotIndex: number;
  readonly recipeId: string;
  readonly startDay: number;
  readonly startSeason: Season;
  readonly startYear: number;
}

export interface InventorySlot {
  readonly itemId: string;
  readonly quantity: number;
}

export interface EquippedTools {
  readonly current: string | null;
}

export interface BuildingState {
  readonly buildingId: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly buildStartDay: number | null;
  readonly buildTargetDay: number | null;
}

export interface DecorationState {
  readonly decorationId: string;
  readonly x: number;
  readonly y: number;
}

export interface CombatStats {
  readonly hp: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

export interface GameSaveData {
  readonly version: number;
  readonly lastSavedAt: string;
  readonly playerName: string;
  readonly gold: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly day: number;
  readonly season: Season;
  readonly year: number;
  readonly timeOfDay: number;
  readonly farmPlots: ReadonlyArray<FarmPlotState>;
  readonly animals: ReadonlyArray<AnimalState>;
  readonly fermentations: ReadonlyArray<FermentationState>;
  readonly inventory: ReadonlyArray<InventorySlot>;
  readonly equippedTools: EquippedTools;
  readonly npcRelations: Readonly<Record<string, number>>;
  readonly completedQuests: ReadonlyArray<string>;
  readonly unlockedAreas: ReadonlyArray<string>;
  readonly discoveredRecipes: ReadonlyArray<string>;
  readonly buildings: ReadonlyArray<BuildingState>;
  readonly decorations: ReadonlyArray<DecorationState>;
  readonly playerLevel: number;
  readonly playerExp: number;
  readonly playerStats: CombatStats;
  readonly completedSeasonalQuests?: ReadonlyArray<string>;
}
