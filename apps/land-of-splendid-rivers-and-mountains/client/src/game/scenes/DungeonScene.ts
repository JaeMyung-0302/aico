import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { CombatSystem } from "../systems/combat";
import { EnergySystem } from "../systems/energy";
import { InventorySystem } from "../systems/inventory";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { useGameStore } from "@/stores/useGameStore";
import { saveManager } from "@/lib/save-manager";

const PLAYER_SPAWN_X = 9;
const PLAYER_SPAWN_Y = 23;

const FLOOR_MONSTERS: ReadonlyArray<
  ReadonlyArray<{ id: string; x: number; y: number }>
> = [
  [
    { id: "cheuksin", x: 5, y: 5 },
    { id: "cheuksin", x: 14, y: 8 },
    { id: "cheuksin", x: 10, y: 12 },
  ],
  [
    { id: "dokkaebi", x: 5, y: 5 },
    { id: "dokkaebi", x: 14, y: 5 },
    { id: "gwishin", x: 5, y: 15 },
    { id: "gwishin", x: 14, y: 15 },
  ],
  [
    { id: "gumiho", x: 5, y: 8 },
    { id: "gumiho", x: 14, y: 8 },
    { id: "jangsan", x: 10, y: 12 },
  ],
  [{ id: "imugi", x: 10, y: 8 }],
  // Ocean dungeon floors (5-8)
  [
    { id: "jellyfish", x: 5, y: 5 },
    { id: "jellyfish", x: 14, y: 5 },
    { id: "seahorse", x: 10, y: 12 },
  ],
  [
    { id: "octopus", x: 5, y: 8 },
    { id: "octopus", x: 14, y: 8 },
    { id: "jellyfish", x: 5, y: 15 },
    { id: "jellyfish", x: 14, y: 15 },
  ],
  [
    { id: "shark", x: 5, y: 8 },
    { id: "shark", x: 14, y: 8 },
    { id: "octopus", x: 10, y: 12 },
  ],
  [{ id: "mermaid", x: 10, y: 8 }],
  // Final dungeon: 이무기의 소굴 (floors 9-12)
  [
    { id: "darkDokkaebi", x: 5, y: 5 },
    { id: "darkDokkaebi", x: 14, y: 5 },
    { id: "darkDokkaebi", x: 10, y: 15 },
  ],
  [
    { id: "shadowGumiho", x: 5, y: 8 },
    { id: "shadowGumiho", x: 14, y: 8 },
    { id: "darkDokkaebi", x: 5, y: 15 },
    { id: "darkDokkaebi", x: 14, y: 15 },
  ],
  [
    { id: "stormImugi", x: 5, y: 8 },
    { id: "stormImugi", x: 14, y: 8 },
    { id: "shadowGumiho", x: 10, y: 12 },
  ],
  [{ id: "millenniumImugi", x: 10, y: 8 }],
];

const MAX_FLOORS = FLOOR_MONSTERS.length;

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private combatSystem!: CombatSystem;
  private energySystem!: EnergySystem;
  private inventory!: InventorySystem;

  private readonly emitPosition = createPositionEmitter("DungeonScene");
  private currentFloor = 0;
  private monstersAlive = 0;
  private floorCleared = false;
  private isTransitioning = false;
  private isWinterDungeon = false;

  constructor() {
    super({ key: "DungeonScene" });
  }

  preload(): void {
    this.createTilesetTexture();
    this.load.tilemapTiledJSON(
      "mountain-map",
      "/assets/tilemaps/mountain.json",
    );
  }

  create(): void {
    this.currentFloor = 0;
    this.floorCleared = false;
    this.isTransitioning = false;
    this.isWinterDungeon = useGameStore.getState().season === "winter";

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

    this.combatSystem = new CombatSystem();
    this.energySystem = new EnergySystem();
    this.inventory = new InventorySystem();
    this.combatSystem.init(this);
    this.energySystem.init(this);
    this.combatSystem.setPlayerSprite(this.player.sprite);

    const store = useGameStore.getState();
    this.energySystem.setState(store.energy, store.maxEnergy);
    this.combatSystem.setStats(
      store.playerHp,
      store.playerMaxHp,
      store.playerAttack,
      store.playerDefense,
    );
    this.inventory.loadState([...store.inventory], { ...store.equippedTools });

    const syncWeapon = (toolId: string | null) => {
      if (toolId) {
        const weaponId = toolId.replace("tool-", "weapon-");
        this.combatSystem.equipWeapon(weaponId);
      } else {
        this.combatSystem.equipWeapon("weapon-fist");
      }
    };
    syncWeapon(store.equippedTools.current);

    const syncCombatHp = () => {
      useGameStore
        .getState()
        .setPlayerHp(this.combatSystem.getHp(), this.combatSystem.getMaxHp());
    };

    const syncInventory = () => {
      const state = this.inventory.getState();
      useGameStore.getState().setInventory(state.slots);
      useGameStore.getState().setEquippedTools(state.equipped);
      syncWeapon(state.equipped.current);
    };

    const onCombatDefeated = ({
      drops,
    }: {
      monsterId: string;
      drops: ReadonlyArray<{ itemId: string; quantity: number }>;
    }) => {
      this.monstersAlive--;
      for (const drop of drops) {
        this.inventory.addItem(drop.itemId, drop.quantity);
      }
      syncInventory();
      if (this.monstersAlive <= 0) {
        this.onFloorCleared();
      }
    };

    const onCombatPlayerHit = () => {
      syncCombatHp();
    };

    const onCombatPlayerDied = () => {
      this.isTransitioning = true;
      this.combatSystem.clearMonsters();
      this.time.delayedCall(800, () => {
        syncCombatHp();
        this.patchAndReturn();
      });
    };

    const onFainted = ({ goldPenaltyRate }: { goldPenaltyRate: number }) => {
      const s = useGameStore.getState();
      const penalty = Math.floor(s.gold * goldPenaltyRate);
      if (penalty > 0) {
        eventBus.emit("gold:changed", {
          amount: -penalty,
          total: s.gold - penalty,
        });
      }
    };

    const onUseFood = ({ itemId }: { itemId: string }) => {
      if (!this.inventory.hasItem(itemId)) return;
      this.inventory.removeItem(itemId);
      const energyAmount = itemId.startsWith("food-") ? 20 : 10;
      this.energySystem.recover(energyAmount);
      syncInventory();
    };

    eventBus.on("inventory:useFood", onUseFood);
    eventBus.on("combat:defeated", onCombatDefeated);
    eventBus.on("combat:playerHit", onCombatPlayerHit);
    eventBus.on("combat:playerDied", onCombatPlayerDied);
    eventBus.on("energy:fainted", onFainted);

    useGameStore.getState().setDungeonFloor(1, MAX_FLOORS);
    eventBus.emit("dungeon:entered", { floor: 1 });
    this.spawnFloorMonsters();
    syncCombatHp();

    this.setupCollision(map);
    this.setupCamera(map);

    this.events.once("shutdown", () => {
      eventBus.off("inventory:useFood", onUseFood);
      eventBus.off("combat:defeated", onCombatDefeated);
      eventBus.off("combat:playerHit", onCombatPlayerHit);
      eventBus.off("combat:playerDied", onCombatPlayerDied);
      eventBus.off("energy:fainted", onFainted);
      saveManager.save();
      this.inventory.destroy();
      this.combatSystem.destroy();
      this.energySystem.destroy();
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.combatSystem.update(this, _time, delta);

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

    if (inputState.action && this.combatSystem.isAlive()) {
      const cost = this.combatSystem.getEquippedWeaponEnergyCost();
      if (this.energySystem.consume("COMBAT") || cost === 0) {
        const dir = this.player.getDirection();
        const dirMap = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
        };
        const d = dirMap[dir];
        this.combatSystem.performAttack(
          this.player.sprite.x,
          this.player.sprite.y,
          d.x,
          d.y,
        );
      }
    }

    if (this.floorCleared && this.currentFloor < MAX_FLOORS - 1) {
      this.checkExitPortal();
    }
  }

  private spawnFloorMonsters(): void {
    this.combatSystem.clearMonsters();
    const floorConfig = FLOOR_MONSTERS[this.currentFloor];
    if (!floorConfig) return;

    this.monstersAlive = 0;
    for (const spawn of floorConfig) {
      const x =
        spawn.x * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
      const y =
        spawn.y * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
      const monster = this.combatSystem.spawnMonster(spawn.id, x, y);
      if (monster) {
        if (this.isWinterDungeon) {
          monster.applyModifier(1.2, 1.2);
        }
        this.monstersAlive++;
      }
    }
    this.floorCleared = false;
  }

  private onFloorCleared(): void {
    this.floorCleared = true;
    if (this.currentFloor >= MAX_FLOORS - 1) {
      this.time.delayedCall(1000, () => {
        this.completeDungeon();
      });
    }
  }

  private checkExitPortal(): void {
    if (this.isTransitioning) return;

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);

    if (tileY <= 1 && tileX >= 9 && tileX <= 10) {
      this.nextFloor();
    }
  }

  private nextFloor(): void {
    this.isTransitioning = true;
    this.currentFloor++;
    useGameStore.getState().setDungeonFloor(this.currentFloor + 1);

    const spawnX =
      PLAYER_SPAWN_X * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    const spawnY =
      PLAYER_SPAWN_Y * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    this.player.sprite.setPosition(spawnX, spawnY);
    this.player.sprite.setVelocity(0, 0);

    this.spawnFloorMonsters();
    this.isTransitioning = false;
  }

  private completeDungeon(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    eventBus.emit("dungeon:cleared", { floor: this.currentFloor + 1 });

    const store = useGameStore.getState();
    const reward = this.isWinterDungeon ? 600 : 500;
    eventBus.emit("gold:changed", {
      amount: reward,
      total: store.gold + reward,
    });

    this.patchAndReturn();
  }

  private returnToFarm(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.patchAndReturn();
  }

  private patchAndReturn(): void {
    useGameStore.getState().setDungeonFloor(0);

    const invState = this.inventory.getState();
    saveManager.patchSave({
      playerHp: this.combatSystem.getHp(),
      playerMaxHp: this.combatSystem.getMaxHp(),
      energy: this.energySystem.getCurrent(),
      maxEnergy: this.energySystem.getMax(),
      inventory: invState.slots,
      equippedTools: invState.equipped,
      gold: useGameStore.getState().gold,
    });

    this.scene.start("VillageScene", { spawnX: 14, spawnY: 1 });
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-mountain")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    const colors = [0x555555, 0x8b6914, 0x4169e1, 0x333333];

    const canvas = this.textures.createCanvas(
      "tileset-mountain",
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
    const map = this.make.tilemap({ key: "mountain-map" });
    const tileset = map.addTilesetImage("mountain-tiles", "tileset-mountain");
    if (!tileset) throw new Error("Failed to load mountain tileset");

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
