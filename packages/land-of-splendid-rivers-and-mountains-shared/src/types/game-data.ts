import type { Season } from "./save.js";

export interface CropDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly seasons: ReadonlyArray<Season>;
  readonly growthDays: number;
  readonly sellPrice: number;
  readonly seedPrice: number;
  readonly energyRestore: number;
}

export interface RecipeDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly type: "cooking" | "fermentation";
  readonly ingredients: ReadonlyArray<
    Readonly<{ itemId: string; quantity: number }>
  >;
  readonly resultItemId: string;
  readonly fermentationDays?: number;
}

export interface NpcScheduleEntry {
  readonly season: Season;
  readonly location: string;
  readonly spawnTileX: number;
  readonly spawnTileY: number;
}

export interface NpcDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly location: string;
  readonly spawnTileX: number;
  readonly spawnTileY: number;
  readonly lovedGifts: ReadonlyArray<string>;
  readonly likedGifts: ReadonlyArray<string>;
  readonly dislikedGifts: ReadonlyArray<string>;
  readonly schedule?: ReadonlyArray<NpcScheduleEntry>;
}

export interface ItemDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly type:
    | "seed"
    | "crop"
    | "tool"
    | "food"
    | "material"
    | "drop"
    | "decoration"
    | "fish"
    | "gift";
  readonly stackable: boolean;
  readonly maxStack: number;
  readonly sellPrice: number;
}

export interface BuildingDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly descKey: string;
  readonly location: "farm" | "village";
  readonly levels: ReadonlyArray<{
    readonly level: number;
    readonly goldCost: number;
    readonly materials: ReadonlyArray<{
      readonly itemId: string;
      readonly quantity: number;
    }>;
    readonly buildDays: number;
  }>;
}

export interface AnimalDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly buyPrice: number;
  readonly feedItemId: string;
  readonly produceItemId: string;
  readonly produceBaseChance: number;
}

export interface MonsterDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly drops: ReadonlyArray<Readonly<{ itemId: string; chance: number }>>;
  readonly expReward: number;
}

export interface WeaponDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly damage: number;
  readonly range: number;
  readonly cooldownMs: number;
  readonly knockback: number;
  readonly energyCost: number;
}

export interface FishDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly seasons: ReadonlyArray<Season>;
  readonly difficulty: number;
  readonly basePrice: number;
  readonly rarity: "common" | "uncommon" | "rare" | "legendary";
}

export interface QuestDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly descKey: string;
  readonly type: "main" | "side";
  readonly npcId: string | null;
  readonly requirements: ReadonlyArray<
    Readonly<{
      type: "harvest" | "fish" | "cook" | "gift" | "explore" | "combat";
      target: string;
      quantity: number;
    }>
  >;
  readonly rewards: ReadonlyArray<
    Readonly<{ itemId: string; quantity: number }>
  >;
  readonly goldReward: number;
  readonly prerequisite: string | null;
}

export interface EventDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly descKey: string;
  readonly season: Season;
  readonly triggerDay: number;
  readonly durationDays: number;
  readonly type: "festival" | "harvest" | "seasonal" | "dungeon";
  readonly rewards: ReadonlyArray<
    Readonly<{ itemId: string; quantity: number }>
  >;
  readonly goldReward: number;
}
