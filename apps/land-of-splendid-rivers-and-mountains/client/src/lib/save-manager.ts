import type {
  Season,
  Weather,
  FarmPlotState,
  FermentationState,
  BuildingState,
  AnimalState,
  InventorySlot,
  EquippedTools,
} from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "./event-bus";
import { api, getUserId } from "./api";

const SAVE_KEY = "land-of-splendid-rivers-and-mountains:save";
const SYNC_DEBOUNCE_MS = 2000;
export const SAVE_VERSION = 12;

export interface SaveData {
  readonly version: number;
  readonly lastSavedAt: string;
  readonly gold: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly day: number;
  readonly season: Season;
  readonly year: number;
  readonly timeOfDay: number;
  readonly weather: Weather;
  readonly farmPlots: ReadonlyArray<FarmPlotState>;
  readonly inventory: ReadonlyArray<InventorySlot | null>;
  readonly equippedTools: EquippedTools;
  readonly npcRelations: Readonly<Record<string, number>>;
  readonly fermentations: ReadonlyArray<FermentationState>;
  readonly buildings: ReadonlyArray<BuildingState>;
  readonly animals: ReadonlyArray<AnimalState>;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly playerAttack: number;
  readonly playerDefense: number;
  readonly completedEvents: ReadonlyArray<string>;
  readonly activeEventId: string | null;
  readonly completedSeasonalQuests?: ReadonlyArray<string>;
  readonly reputation?: number;
  readonly unlockedIsland?: boolean;
  readonly activeQuests?: ReadonlyArray<string>;
  readonly completedQuests?: ReadonlyArray<string>;
  readonly questProgress?: Readonly<Record<string, ReadonlyArray<number>>>;
}

const REQUIRED_SAVE_FIELDS = [
  "version",
  "gold",
  "energy",
  "maxEnergy",
  "day",
  "season",
  "year",
  "timeOfDay",
  "farmPlots",
  "inventory",
  "equippedTools",
] as const;

const isValidSaveData = (data: unknown): data is SaveData => {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return REQUIRED_SAVE_FIELDS.every((field) => field in obj);
};

export type SaveDataCollector = () => SaveData;
export type SaveDataRestorer = (data: SaveData) => void;

export class SaveManager {
  private collector: SaveDataCollector | null = null;
  private restorer: SaveDataRestorer | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSlot = 1;

  private readonly onDayEnd = (): void => {
    this.save();
  };

  setup(collector: SaveDataCollector, restorer: SaveDataRestorer): void {
    this.collector = collector;
    this.restorer = restorer;
    eventBus.on("time:dayEnd", this.onDayEnd);
  }

  setSlot(slot: number): void {
    this.activeSlot = slot;
  }

  destroy(): void {
    eventBus.off("time:dayEnd", this.onDayEnd);
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.collector = null;
    this.restorer = null;
  }

  save(): boolean {
    if (!this.collector) return false;

    try {
      eventBus.emit("save:started", undefined);
      const data = this.collector();
      const saveData: SaveData = {
        ...data,
        version: SAVE_VERSION,
        lastSavedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(saveData);
      localStorage.setItem(SAVE_KEY, serialized);
      this.scheduleSyncToServer(serialized);
      eventBus.emit("save:completed", { success: true });
      return true;
    } catch {
      eventBus.emit("save:completed", { success: false });
      return false;
    }
  }

  load(): boolean {
    if (!this.restorer) return false;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const parsed: unknown = JSON.parse(raw);
      if (!isValidSaveData(parsed)) {
        this.deleteSave();
        return false;
      }
      const migrated = this.migrate(parsed);
      this.restorer(migrated);
      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  patchSave(updates: Partial<SaveData>): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSaveData(parsed)) return;
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          ...parsed,
          ...updates,
          lastSavedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }
  }

  private scheduleSyncToServer(serialized: string): void {
    if (!getUserId()) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    const slot = this.activeSlot;
    this.syncTimer = setTimeout(() => {
      this.syncToServer(slot, serialized).catch(() => {
        /* server sync is best-effort */
      });
    }, SYNC_DEBOUNCE_MS);
  }

  private async syncToServer(slot: number, serialized: string): Promise<void> {
    const body = `{"data":${serialized},"version":${SAVE_VERSION}}`;
    await api.putRaw(`/saves/${slot}`, body);
  }

  async loadFromServer(slot: number): Promise<boolean> {
    if (!this.restorer || !getUserId()) return false;
    try {
      const save = await api.get<{ data: unknown }>(`/saves/${slot}`);
      if (!isValidSaveData(save.data)) return false;
      const migrated = this.migrate(save.data);
      this.restorer(migrated);
      localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
      this.activeSlot = slot;
      return true;
    } catch {
      return false;
    }
  }

  private migrate(data: SaveData): SaveData {
    if (data.version === SAVE_VERSION) return data;

    let migrated: SaveData = { ...data };
    if (migrated.version === 1) {
      migrated = { ...migrated, weather: "clear", version: 2 };
    }
    if (migrated.version === 2) {
      migrated = { ...migrated, npcRelations: {}, version: 3 };
    }
    if (migrated.version === 3) {
      migrated = { ...migrated, fermentations: [], version: 4 };
    }
    if (migrated.version === 4) {
      migrated = { ...migrated, buildings: [], version: 5 };
    }
    if (migrated.version === 5) {
      migrated = { ...migrated, animals: [], version: 6 };
    }
    if (migrated.version === 6) {
      migrated = {
        ...migrated,
        playerHp: 50,
        playerMaxHp: 50,
        playerAttack: 5,
        playerDefense: 2,
        version: 7,
      };
    }
    if (migrated.version === 7) {
      migrated = {
        ...migrated,
        completedEvents: [],
        activeEventId: null,
        version: 8,
      };
    }
    if (migrated.version === 8) {
      migrated = {
        ...migrated,
        completedSeasonalQuests: [],
        version: 9,
      };
    }
    if (migrated.version === 9) {
      migrated = {
        ...migrated,
        reputation: 0,
        version: 10,
      };
    }
    if (migrated.version === 10) {
      migrated = {
        ...migrated,
        unlockedIsland: false,
        version: 11,
      };
    }
    if (migrated.version === 11) {
      migrated = {
        ...migrated,
        activeQuests: [],
        completedQuests: [],
        questProgress: {},
        version: 12,
      };
    }
    return migrated;
  }
}

export const saveManager = new SaveManager();
