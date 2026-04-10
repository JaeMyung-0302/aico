import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { InventorySystem } from "../systems/inventory";
import { NPCSystem } from "../systems/npc";
import { ReputationSystem } from "../systems/reputation";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { saveManager } from "@/lib/save-manager";
import { useGameStore } from "@/stores/useGameStore";
const PLAYER_SPAWN_X = 12;
const PLAYER_SPAWN_Y = 1;

export class TempleScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private readonly emitPosition = createPositionEmitter("TempleScene");
  private npcSystem: NPCSystem | null = null;

  constructor() {
    super({ key: "TempleScene" });
  }

  preload(): void {
    this.createTilesetTexture();
    this.load.tilemapTiledJSON("temple-map", "/assets/tilemaps/temple.json");
  }

  create(): void {
    this.isTransitioning = false;
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

    eventBus.on("inventory:equipped", syncInventory);

    const npcSystem = new NPCSystem();
    npcSystem.setInitialLocation("temple");
    npcSystem.setCurrentSeason(store.season);
    npcSystem.init(this);
    npcSystem.setPlayerSprite(this.player.sprite);
    this.npcSystem = npcSystem;

    this.setupCollision(map);
    this.setupCamera(map);

    this.events.once("shutdown", () => {
      syncInventory();
      saveManager.patchSave({
        equippedTools: inventory.getEquipped(),
        inventory: [...inventory.getSlots()],
      });
      inventory.destroy();
      this.npcSystem?.destroy();
      this.npcSystem = null;
      eventBus.off("inventory:equipped", syncInventory);
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });
  }

  update(): void {
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

    this.player.update(this.inputManager.getState());
    this.npcSystem?.update(this, this.time.now, 0);
    this.emitPosition(this.player.sprite, this.time.now);

    this.checkPortal();
  }

  private isTransitioning = false;

  private checkPortal(): void {
    if (this.isTransitioning) return;

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);

    if (tileY <= 0 && tileX >= 12 && tileX <= 13) {
      this.isTransitioning = true;
      this.scene.start("VillageScene", { spawnX: 14, spawnY: 38 });
    }
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-temple")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    const colors = [0x2e7d32, 0x795548, 0x4169e1, 0x546e7a];

    const canvas = this.textures.createCanvas(
      "tileset-temple",
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
    const map = this.make.tilemap({ key: "temple-map" });
    const tileset = map.addTilesetImage("temple-tiles", "tileset-temple");
    if (!tileset) throw new Error("Failed to load temple tileset");

    map.createLayer("ground", tileset)?.setDepth(0);
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
