import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import type { FarmPlotState } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { SystemManager } from "../systems/system-manager";
import { TimeWeatherSystem } from "../systems/time-weather";
import { InventorySystem } from "../systems/inventory";
import { EnergySystem } from "../systems/energy";
import { NPCSystem } from "../systems/npc";
import { FermentationSystem, getRecipe } from "../systems/fermentation";
import { BuildingSystem } from "../systems/building";
import { AnimalSystem, getAnimalDef } from "../systems/animal";
import { CombatSystem } from "../systems/combat";
import { ReputationSystem } from "../systems/reputation";
import { QuestSystem } from "../systems/quest";
import { LodSystem } from "../systems/lod";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import { saveManager, SAVE_VERSION } from "@/lib/save-manager";
import type {
  CropDefinition,
  ItemDefinition,
} from "@land-of-splendid-rivers-and-mountains/shared";
import cropsData from "../data/crops.json";
import itemsData from "../data/items.json";

const cropMap = new Map<string, CropDefinition>(
  (cropsData as ReadonlyArray<CropDefinition>).map((c) => [c.id, c]),
);
const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
);

const PLAYER_SPAWN_X = 14;
const PLAYER_SPAWN_Y = 2;

export class VillageScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private systemManager!: SystemManager;
  private npcSystem!: NPCSystem;
  private prevAction = false;
  private readonly emitPosition = createPositionEmitter("VillageScene");

  constructor() {
    super({ key: "VillageScene" });
  }

  preload(): void {
    this.createTilesetTexture();
    this.load.tilemapTiledJSON("village-map", "/assets/tilemaps/village.json");
  }

  create(): void {
    this.isTransitioning = false;
    this.prevAction = false;
    const map = this.loadTilemap();

    this.inputManager = new InputManager();
    this.keyboardInput = new KeyboardInput();
    this.touchInput = new TouchInput();
    this.keyboardInput.init(this);
    this.touchInput.init(this);

    const data = this.scene.settings.data as
      | { spawnX?: number; spawnY?: number }
      | undefined;
    const tileX = data?.spawnX ?? PLAYER_SPAWN_X;
    const tileY = data?.spawnY ?? PLAYER_SPAWN_Y;
    const spawnX =
      tileX * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    const spawnY =
      tileY * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);
    this.player.sprite.setDepth(10);

    const inventory = new InventorySystem();
    const timeWeather = new TimeWeatherSystem();
    const energySystem = new EnergySystem();
    const npcSystem = new NPCSystem();
    const fermentSystem = new FermentationSystem();
    const buildingSystem = new BuildingSystem();
    const animalSystem = new AnimalSystem();
    const combatSystem = new CombatSystem();

    npcSystem.setInitialLocation("village");
    npcSystem.setCurrentSeason(useGameStore.getState().season);
    this.npcSystem = npcSystem;

    this.systemManager = new SystemManager([
      "lod",
      "time-weather",
      "energy",
      "npc",
      "fermentation",
      "building",
      "animal",
      "combat",
      "reputation",
      "quest",
    ]);
    this.systemManager.register(new LodSystem());
    this.systemManager.register(timeWeather);
    this.systemManager.register(energySystem);
    this.systemManager.register(npcSystem);
    this.systemManager.register(fermentSystem);
    this.systemManager.register(buildingSystem);
    this.systemManager.register(animalSystem);
    this.systemManager.register(combatSystem);
    const reputationSystem = new ReputationSystem();
    const questSystem = new QuestSystem();
    this.systemManager.register(reputationSystem);
    this.systemManager.register(questSystem);
    this.systemManager.initAll(this);

    npcSystem.setPlayerSprite(this.player.sprite);

    const syncInventory = () => {
      const state = inventory.getState();
      useGameStore.getState().setInventory(state.slots);
      useGameStore.getState().setEquippedTools(state.equipped);
    };

    const onGiftRequested = ({
      npcId,
      itemId,
    }: {
      npcId: string;
      itemId: string;
    }) => {
      if (!inventory.hasItem(itemId, 1)) return;
      inventory.removeItem(itemId, 1);
      npcSystem.giveGift(npcId, itemId);
      syncInventory();
    };

    const onShopBuy = ({ itemId }: { itemId: string }) => {
      if (!itemId.startsWith("seed-")) return;
      const cropId = itemId.slice(5);
      const cropDef = cropMap.get(cropId);
      if (!cropDef) return;
      const store = useGameStore.getState();
      if (store.gold < cropDef.seedPrice) return;
      if (!inventory.addItem(itemId)) return;
      const newGold = store.gold - cropDef.seedPrice;
      eventBus.emit("gold:changed", {
        amount: -cropDef.seedPrice,
        total: newGold,
      });
      syncInventory();
    };

    const onShopSell = ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      const def = itemMap.get(itemId);
      if (!def || def.sellPrice <= 0) return;
      if (!inventory.hasItem(itemId, quantity)) return;
      inventory.removeItem(itemId, quantity);
      const earnings = def.sellPrice * quantity;
      const store = useGameStore.getState();
      const newGold = store.gold + earnings;
      eventBus.emit("gold:changed", { amount: earnings, total: newGold });
      syncInventory();
    };

    const syncFermentation = () => {
      const slots: {
        slotIndex: number;
        recipeId: string;
        elapsed: number;
        required: number;
      }[] = [];
      for (let i = 0; i < fermentSystem.getSlotCount(); i++) {
        const info = fermentSystem.getSlotInfo(i);
        if (info) slots.push({ slotIndex: i, ...info });
      }
      useGameStore.getState().setFermentationSlots(slots);
    };

    const onCook = ({ recipeId }: { recipeId: string }) => {
      const recipe = getRecipe(recipeId);
      if (!recipe || recipe.type !== "cooking") return;
      for (const ing of recipe.ingredients) {
        if (!inventory.hasItem(ing.itemId, ing.quantity)) return;
      }
      for (const ing of recipe.ingredients) {
        inventory.removeItem(ing.itemId, ing.quantity);
      }
      if (!inventory.addItem(recipe.resultItemId)) {
        for (const ing of recipe.ingredients) {
          inventory.addItem(ing.itemId, ing.quantity);
        }
        return;
      }
      syncInventory();
    };

    const onFerment = ({ recipeId }: { recipeId: string }) => {
      const recipe = getRecipe(recipeId);
      if (!recipe || recipe.type !== "fermentation") return;
      for (const ing of recipe.ingredients) {
        if (!inventory.hasItem(ing.itemId, ing.quantity)) return;
      }
      const slotIndex = fermentSystem.startFermentation(recipeId);
      if (slotIndex === null) return;
      for (const ing of recipe.ingredients) {
        inventory.removeItem(ing.itemId, ing.quantity);
      }
      syncInventory();
      syncFermentation();
    };

    const onCollect = ({ slotIndex }: { slotIndex: number }) => {
      const resultItemId = fermentSystem.collectSlot(slotIndex);
      if (!resultItemId) return;
      inventory.addItem(resultItemId);
      syncInventory();
      syncFermentation();
    };

    const syncBuildings = () => {
      useGameStore.getState().setBuildings(buildingSystem.getState());
    };

    const onBuildingBuild = ({ buildingId }: { buildingId: string }) => {
      const cost = buildingSystem.getNextLevelCost(buildingId);
      if (!cost) return;
      const store = useGameStore.getState();
      if (store.gold < cost.goldCost) return;
      for (const mat of cost.materials) {
        if (!inventory.hasItem(mat.itemId, mat.quantity)) return;
      }
      if (!buildingSystem.build(buildingId, 0, 0)) return;
      for (const mat of cost.materials) {
        inventory.removeItem(mat.itemId, mat.quantity);
      }
      const newGold = store.gold - cost.goldCost;
      eventBus.emit("gold:changed", { amount: -cost.goldCost, total: newGold });
      syncInventory();
      syncBuildings();
    };

    const onBuildingUpgrade = ({ buildingId }: { buildingId: string }) => {
      const cost = buildingSystem.getNextLevelCost(buildingId);
      if (!cost) return;
      const store = useGameStore.getState();
      if (store.gold < cost.goldCost) return;
      for (const mat of cost.materials) {
        if (!inventory.hasItem(mat.itemId, mat.quantity)) return;
      }
      if (!buildingSystem.upgrade(buildingId)) return;
      for (const mat of cost.materials) {
        inventory.removeItem(mat.itemId, mat.quantity);
      }
      const newGold = store.gold - cost.goldCost;
      eventBus.emit("gold:changed", { amount: -cost.goldCost, total: newGold });
      syncInventory();
      syncBuildings();
    };

    const onFainted = ({ goldPenaltyRate }: { goldPenaltyRate: number }) => {
      const store = useGameStore.getState();
      const penalty = Math.floor(store.gold * goldPenaltyRate);
      if (penalty > 0) {
        const newGold = store.gold - penalty;
        eventBus.emit("gold:changed", { amount: -penalty, total: newGold });
      }
    };

    const syncAnimals = () => {
      useGameStore.getState().setAnimals(animalSystem.getState());
    };

    const onAnimalBuy = ({
      animalType,
      name,
    }: {
      animalType: string;
      name: string;
    }) => {
      const def = getAnimalDef(animalType);
      if (!def) return;
      const store = useGameStore.getState();
      if (store.gold < def.buyPrice) return;
      const barnLevel =
        store.buildings.find((b) => b.buildingId === "barn")?.level ?? 0;
      const maxAnimals = barnLevel * 3;
      if (animalSystem.getAnimalCount() >= maxAnimals) return;
      const animalId = animalSystem.buyAnimal(animalType, name);
      if (!animalId) return;
      const newGold = store.gold - def.buyPrice;
      eventBus.emit("gold:changed", { amount: -def.buyPrice, total: newGold });
      syncAnimals();
    };

    const onAnimalFeed = ({ animalId }: { animalId: string }) => {
      const animals = animalSystem.getState();
      const animal = animals.find((a) => a.id === animalId);
      if (!animal) return;
      const def = getAnimalDef(animal.type);
      if (!def) return;
      if (!inventory.hasItem(def.feedItemId, 1)) return;
      if (!animalSystem.feedAnimal(animalId)) return;
      inventory.removeItem(def.feedItemId, 1);
      syncInventory();
      syncAnimals();
    };

    const onAnimalCollect = ({ animalId }: { animalId: string }) => {
      const produceItemId = animalSystem.collectProduce(animalId);
      if (produceItemId) {
        inventory.addItem(produceItemId);
        syncInventory();
      }
      syncAnimals();
    };

    const onUseFood = ({ itemId }: { itemId: string }) => {
      if (!inventory.hasItem(itemId)) return;
      inventory.removeItem(itemId);
      let energyAmount = itemId.startsWith("food-") ? 20 : 10;
      if (itemId.startsWith("crop-")) {
        const cropDef = cropMap.get(itemId.replace("crop-", ""));
        if (cropDef) energyAmount = cropDef.energyRestore;
      }
      energySystem.recover(energyAmount);
      syncInventory();
    };

    eventBus.on("inventory:useFood", onUseFood);
    eventBus.on("inventory:changed", syncInventory);
    eventBus.on("inventory:equipped", syncInventory);
    eventBus.on("shop:buy", onShopBuy);
    eventBus.on("shop:sell", onShopSell);
    eventBus.on("npc:giftRequested", onGiftRequested);
    eventBus.on("energy:fainted", onFainted);
    eventBus.on("crafting:cook", onCook);
    eventBus.on("crafting:ferment", onFerment);
    eventBus.on("crafting:collect", onCollect);
    eventBus.on("building:build", onBuildingBuild);
    eventBus.on("building:upgrade", onBuildingUpgrade);
    eventBus.on("building:completed", syncBuildings);
    eventBus.on("animal:buy", onAnimalBuy);
    eventBus.on("animal:feed", onAnimalFeed);
    eventBus.on("animal:collect", onAnimalCollect);

    syncInventory();

    let cachedFarmPlots: ReadonlyArray<FarmPlotState> = [];
    let cachedCompletedEvents: ReadonlyArray<string> = [];
    let cachedActiveEventId: string | null = null;
    let cachedReputation = 0;
    let cachedUnlockedIsland = false;

    saveManager.setup(
      () => {
        const store = useGameStore.getState();
        const invState = inventory.getState();
        return {
          version: SAVE_VERSION,
          lastSavedAt: new Date().toISOString(),
          gold: store.gold,
          energy: energySystem.getCurrent(),
          maxEnergy: energySystem.getMax(),
          day: timeWeather.getDay(),
          season: timeWeather.getSeason(),
          year: timeWeather.getYear(),
          timeOfDay: timeWeather.getTimeOfDay(),
          weather: timeWeather.getWeather(),
          farmPlots: cachedFarmPlots,
          inventory: invState.slots,
          equippedTools: invState.equipped,
          npcRelations: npcSystem.getRelationsState(),
          fermentations: fermentSystem.getState(),
          buildings: buildingSystem.getState(),
          animals: animalSystem.getState(),
          playerHp: combatSystem.getHp(),
          playerMaxHp: combatSystem.getMaxHp(),
          playerAttack: combatSystem.getAttack(),
          playerDefense: combatSystem.getDefense(),
          completedEvents: cachedCompletedEvents,
          activeEventId: cachedActiveEventId,
          reputation: cachedReputation,
          unlockedIsland: cachedUnlockedIsland,
          activeQuests: questSystem.getState().active,
          completedQuests: questSystem.getState().completed,
          questProgress: questSystem.getState().progress,
        };
      },
      (data) => {
        timeWeather.setState(
          data.day,
          data.season,
          data.year,
          data.timeOfDay,
          data.weather,
        );
        inventory.loadState(data.inventory, data.equippedTools);
        energySystem.setState(data.energy, data.maxEnergy);
        cachedFarmPlots = data.farmPlots ?? [];
        cachedCompletedEvents = data.completedEvents ?? [];
        cachedActiveEventId = data.activeEventId ?? null;
        cachedReputation = data.reputation ?? 0;
        cachedUnlockedIsland = data.unlockedIsland ?? false;
        const relations = data.npcRelations ?? {};
        npcSystem.loadRelationsState(relations);
        fermentSystem.loadState(data.fermentations ?? []);
        fermentSystem.setTime(data.day, data.season, data.year);
        buildingSystem.loadState(data.buildings ?? []);
        buildingSystem.setDay(data.day);
        animalSystem.loadState(data.animals ?? []);
        combatSystem.setStats(
          data.playerHp ?? 50,
          data.playerMaxHp ?? 50,
          data.playerAttack ?? 5,
          data.playerDefense ?? 2,
        );
        const store = useGameStore.getState();
        store.setGold(data.gold);
        store.setTime(data.day, data.season, data.year, data.timeOfDay);
        store.setWeather(data.weather);
        for (const [npcId, value] of Object.entries(relations)) {
          store.setNpcRelation(npcId, value);
        }
        reputationSystem.loadState(data.reputation ?? 0);
        npcSystem.setCurrentSeason(data.season);
        npcSystem.setLocation("village", this);
        questSystem.loadState(
          data.activeQuests ?? [],
          data.completedQuests ?? [],
          data.questProgress ?? {},
        );
        syncInventory();
        syncFermentation();
        syncBuildings();
        syncAnimals();
        useGameStore
          .getState()
          .setPlayerHp(
            combatSystem.getHp(),
            combatSystem.getMaxHp(),
            combatSystem.getAttack(),
            combatSystem.getDefense(),
          );
      },
    );

    if (saveManager.hasSave()) {
      saveManager.load();
    }

    this.setupCollision(map);
    this.setupCamera(map);

    this.events.once("shutdown", () => {
      saveManager.save();
      saveManager.destroy();
      inventory.destroy();
      eventBus.off("inventory:useFood", onUseFood);
      eventBus.off("inventory:changed", syncInventory);
      eventBus.off("inventory:equipped", syncInventory);
      eventBus.off("shop:buy", onShopBuy);
      eventBus.off("shop:sell", onShopSell);
      eventBus.off("npc:giftRequested", onGiftRequested);
      eventBus.off("energy:fainted", onFainted);
      eventBus.off("crafting:cook", onCook);
      eventBus.off("crafting:ferment", onFerment);
      eventBus.off("crafting:collect", onCollect);
      eventBus.off("building:build", onBuildingBuild);
      eventBus.off("building:upgrade", onBuildingUpgrade);
      eventBus.off("building:completed", syncBuildings);
      eventBus.off("animal:buy", onAnimalBuy);
      eventBus.off("animal:feed", onAnimalFeed);
      eventBus.off("animal:collect", onAnimalCollect);
      this.systemManager.destroyAll();
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.systemManager.updateAll(this, _time, delta);

    const pointer = this.input.activePointer;
    const isTouchActive = pointer.isDown && pointer.wasTouch;
    const rawState = isTouchActive
      ? this.touchInput.getState()
      : this.keyboardInput.getState();

    this.inputManager.updateFromProvider(rawState);
    const inputState = this.inputManager.getState();

    if (useGameStore.getState().dialogOpen) {
      this.player.sprite.setVelocity(0, 0);
      return;
    }

    this.player.update(inputState);
    this.emitPosition(this.player.sprite, _time);

    const actionPressed = inputState.action && !this.prevAction;
    this.prevAction = inputState.action;
    if (actionPressed) {
      this.handleNpcInteract();
    }

    this.checkPortal();
  }

  private handleNpcInteract(): void {
    const nearbyNpcs = this.npcSystem.getNpcsInRange(
      this.player.sprite.x,
      this.player.sprite.y,
      GAME_CONSTANTS.TILE_SIZE * 2,
    );
    if (nearbyNpcs.length > 0) {
      this.npcSystem.talk(nearbyNpcs[0]!.getDefinition().id);
    }
  }

  private isTransitioning = false;

  private checkPortal(): void {
    if (this.isTransitioning) return;

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);

    // 좌 → Farm
    if (tileX <= 0 && tileY >= 14 && tileY <= 15) {
      this.isTransitioning = true;
      saveManager.save();
      this.scene.start("FarmScene", { spawnX: 28, spawnY: 14 });
    }

    // 상 → Dungeon
    if (tileY <= 0 && tileX >= 14 && tileX <= 15) {
      this.isTransitioning = true;
      saveManager.save();
      this.scene.start("DungeonScene");
    }

    // 우 → River
    if (tileX >= 29 && tileY >= 14 && tileY <= 15) {
      this.isTransitioning = true;
      saveManager.save();
      this.scene.start("RiverScene");
    }

    // 하 → Temple
    if (tileY >= 39 && tileX >= 14 && tileX <= 15) {
      this.isTransitioning = true;
      saveManager.save();
      this.scene.start("TempleScene");
    }
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-village")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    const colors = [0x228b22, 0x8b6914, 0x4169e1, 0x9e9e9e];

    const canvas = this.textures.createCanvas(
      "tileset-village",
      size * 2,
      size * 2,
    );
    if (!canvas) return;

    const ctx = canvas.context;
    for (let i = 0; i < colors.length; i++) {
      const x = (i % 2) * size;
      const y = Math.floor(i / 2) * size;
      const hex = colors[i]!;
      ctx.fillStyle = `#${hex.toString(16).padStart(6, "0")}`;
      ctx.fillRect(x, y, size, size);
    }
    canvas.refresh();
  }

  private loadTilemap(): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key: "village-map" });
    const tileset = map.addTilesetImage("village-tiles", "tileset-village");
    if (!tileset) throw new Error("Failed to load village tileset");

    const groundLayer = map.createLayer("ground", tileset);
    groundLayer?.setDepth(0);

    const pathLayer = map.createLayer("path", tileset);
    pathLayer?.setDepth(1);

    const objectsLayer = map.createLayer("objects", tileset);
    objectsLayer?.setDepth(2);

    map.createLayer("collision", tileset)?.setVisible(false);

    return map;
  }

  private setupCollision(map: Phaser.Tilemaps.Tilemap): void {
    const collisionLayer = map.getLayer("collision")?.tilemapLayer;
    if (!collisionLayer) return;

    collisionLayer.setCollisionByExclusion([-1, 0]);
    this.physics.add.collider(this.player.sprite, collisionLayer);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const mapWidth = map.widthInPixels;
    const mapHeight = map.heightInPixels;

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
  }
}
