import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { InventorySystem } from "../systems/inventory";
import { QuestSystem } from "../systems/quest";
import { EnergySystem } from "../systems/energy";
import { setupRewardHandler } from "../systems/reward";
import { setupShopHandlers } from "../systems/shop";
import { setupMarriageHandler } from "../systems/marriage-runtime";
import { NPCSystem } from "../systems/npc";
import { FishingSystem } from "../systems/fishing";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { saveManager } from "@/lib/save-manager";
import { useGameStore } from "@/stores/useGameStore";

const PLAYER_SPAWN_X = 12;
const PLAYER_SPAWN_Y = 1;

export class IslandScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private npcSystem: NPCSystem | null = null;
  private fishingSystem: FishingSystem | null = null;
  private energySystem: EnergySystem | null = null;
  private groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private prevAction = false;
  private readonly emitPosition = createPositionEmitter("IslandScene");

  constructor() {
    super({ key: "IslandScene" });
  }

  preload(): void {
    this.createTilesetTexture();
    this.load.tilemapTiledJSON("island-map", "/assets/tilemaps/island.json");
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

    const spawnX =
      PLAYER_SPAWN_X * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    const spawnY =
      PLAYER_SPAWN_Y * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);
    this.player.sprite.setDepth(10);

    const inventory = new InventorySystem();
    const store = useGameStore.getState();
    inventory.loadState(store.inventory, store.equippedTools);

    const syncInventory = () => {
      const state = inventory.getState();
      useGameStore.getState().setInventory(state.slots);
      useGameStore.getState().setEquippedTools(state.equipped);
    };

    const npcSystem = new NPCSystem();
    npcSystem.setInitialLocation("island");
    npcSystem.setCurrentSeason(store.season);
    npcSystem.loadRelationsState(store.npcRelations);
    npcSystem.init(this);
    npcSystem.setPlayerSprite(this.player.sprite);
    this.npcSystem = npcSystem;

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

    eventBus.on("inventory:equipped", syncInventory);
    const cleanupReward = setupRewardHandler(inventory, syncInventory);

    const questSystem = new QuestSystem();
    questSystem.init(this);
    questSystem.loadState(
      store.activeQuests,
      store.completedQuests,
      store.questProgress,
    );
    eventBus.on("npc:giftRequested", onGiftRequested);

    const energySystem = new EnergySystem();
    energySystem.setState(store.energy, store.maxEnergy);
    this.energySystem = energySystem;

    const fishingSystem = new FishingSystem();
    fishingSystem.init(this);
    fishingSystem.setLocation("ocean");
    this.fishingSystem = fishingSystem;

    const onFishCaught = ({ fishId }: { fishId: string }) => {
      inventory.addItem(fishId);
      syncInventory();
    };
    eventBus.on("fishing:caught", onFishCaught);
    const cleanupShop = setupShopHandlers(inventory, syncInventory);
    const cleanupMarriage = setupMarriageHandler(inventory, syncInventory);

    this.setupCollision(map);
    this.setupCamera(map);

    this.events.once("shutdown", () => {
      syncInventory();
      saveManager.patchSave({
        equippedTools: inventory.getEquipped(),
        inventory: [...inventory.getSlots()],
        activeQuests: [...questSystem.getState().active],
        completedQuests: [...questSystem.getState().completed],
        questProgress: questSystem.getState().progress,
        npcRelations: useGameStore.getState().npcRelations,
      });
      inventory.destroy();
      this.npcSystem?.destroy();
      this.npcSystem = null;
      cleanupShop();
      cleanupMarriage();
      questSystem.destroy();
      cleanupReward();
      this.fishingSystem?.destroy();
      this.fishingSystem = null;
      eventBus.off("fishing:caught", onFishCaught);
      eventBus.off("inventory:equipped", syncInventory);
      eventBus.off("npc:giftRequested", onGiftRequested);
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });
  }

  update(time: number, delta: number): void {
    const pointer = this.input.activePointer;
    const isTouchActive = pointer.isDown && pointer.wasTouch;
    const rawState = isTouchActive
      ? this.touchInput.getState()
      : this.keyboardInput.getState();

    this.inputManager.updateFromProvider(rawState);

    if (useGameStore.getState().dialogOpen) {
      this.player.sprite.setVelocity(0, 0);
      return;
    }

    this.fishingSystem?.update(this, time, delta);
    if (this.fishingSystem?.isActive()) {
      this.player.sprite.setVelocity(0, 0);
      return;
    }

    const inputState = this.inputManager.getState();
    this.player.update(inputState);
    this.npcSystem?.update(this, this.time.now, 0);
    this.emitPosition(this.player.sprite, this.time.now);

    const actionPressed = inputState.action && !this.prevAction;
    this.prevAction = inputState.action;
    if (actionPressed && this.npcSystem) {
      const nearbyNpcs = this.npcSystem.getNpcsInRange(
        this.player.sprite.x,
        this.player.sprite.y,
        GAME_CONSTANTS.TILE_SIZE * 2,
      );
      if (nearbyNpcs.length > 0) {
        this.npcSystem.talk(nearbyNpcs[0]!.getDefinition().id);
      } else {
        const equipped = useGameStore.getState().equippedTools.current;
        if (
          equipped === "tool-fishingRod" &&
          this.isNearWater() &&
          this.energySystem?.consume("FISH")
        ) {
          this.fishingSystem?.startFishing();
        }
      }
    }

    this.checkPortal();
  }

  private isNearWater(): boolean {
    if (!this.groundLayer) return false;
    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tile = this.groundLayer.getTileAt(tileX + dx, tileY + dy);
        if (tile && tile.index === 3) return true;
      }
    }
    return false;
  }

  private isTransitioning = false;

  private checkPortal(): void {
    if (this.isTransitioning) return;

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);

    // Return to beach
    if (tileY <= 0 && tileX >= 12 && tileX <= 13) {
      this.isTransitioning = true;
      this.scene.start("BeachScene", { spawnX: 12, spawnY: 28 });
    }
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-island")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    // island colors: sand, tropical green, ocean blue, rock
    const colors = [0xf4d03f, 0x2ecc71, 0x1e88e5, 0x8d6e63];

    const canvas = this.textures.createCanvas(
      "tileset-island",
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
    const map = this.make.tilemap({ key: "island-map" });
    const tileset = map.addTilesetImage("island-tiles", "tileset-island");
    if (!tileset) throw new Error("Failed to load island tileset");

    const ground = map.createLayer("ground", tileset);
    ground?.setDepth(0);
    this.groundLayer = ground ?? null;
    map.createLayer("path", tileset)?.setDepth(1);
    map.createLayer("objects", tileset)?.setDepth(2);
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
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }
}
