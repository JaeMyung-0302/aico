import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { CombatSystem } from "../systems/combat";
import { EnergySystem } from "../systems/energy";
import { InventorySystem } from "../systems/inventory";
import { QuestSystem } from "../systems/quest";
import { setupShopHandlers } from "../systems/shop";
import { setupRewardHandler } from "../systems/reward";
import { setupTradeHandler } from "../systems/trade-runtime";
import {
  createInitialPirateState,
  tickPirateKing,
  type PirateKingState,
} from "../systems/pirate-king";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { saveManager } from "@/lib/save-manager";
import { useGameStore } from "@/stores/useGameStore";

const PLAYER_SPAWN_X = 9;
const PLAYER_SPAWN_Y = 23;
const BOSS_ID = "pirateKing";
const BOSS_SPAWN = { x: 10, y: 6 };
const GUARDS = [
  { id: "jellyfish", x: 5, y: 10 },
  { id: "shark", x: 14, y: 10 },
];
const MAX_RALLY_ADDS = 2;

export class PirateScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private combatSystem!: CombatSystem;
  private energySystem!: EnergySystem;
  private inventory!: InventorySystem;
  private questSystem!: QuestSystem;
  private prevAction = false;
  private isTransitioning = false;
  private bossCleared = false;
  private bossState: PirateKingState = createInitialPirateState();
  private bossInstanceId: string | null = null;
  private rallyAdds = 0;
  private readonly emitPosition = createPositionEmitter("PirateScene");

  constructor() {
    super({ key: "PirateScene" });
  }

  preload(): void {
    this.createTilesetTexture();
    this.load.tilemapTiledJSON("pirate-map", "/assets/tilemaps/pirate.json");
  }

  create(): void {
    this.isTransitioning = false;
    this.prevAction = false;
    this.bossCleared = false;
    this.bossState = createInitialPirateState();
    this.rallyAdds = 0;

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
    this.questSystem = new QuestSystem();
    this.combatSystem.init(this);
    this.energySystem.init(this);
    this.questSystem.init(this);
    this.combatSystem.setPlayerSprite(this.player.sprite);

    const store = useGameStore.getState();
    this.energySystem.setState(store.energy, store.maxEnergy);
    this.questSystem.loadState(
      store.activeQuests,
      store.completedQuests,
      store.questProgress,
    );
    this.combatSystem.setStats(
      store.playerHp,
      store.playerMaxHp,
      store.playerAttack,
      store.playerDefense,
    );
    this.inventory.loadState([...store.inventory], { ...store.equippedTools });

    const syncWeapon = (toolId: string | null) => {
      if (toolId) {
        this.combatSystem.equipWeapon(toolId.replace("tool-", "weapon-"));
      } else {
        this.combatSystem.equipWeapon("weapon-fist");
      }
    };
    syncWeapon(store.equippedTools.current);

    const syncInventory = () => {
      const state = this.inventory.getState();
      useGameStore.getState().setInventory(state.slots);
      useGameStore.getState().setEquippedTools(state.equipped);
      syncWeapon(state.equipped.current);
    };

    const syncCombatHp = () => {
      useGameStore
        .getState()
        .setPlayerHp(
          this.combatSystem.getHp(),
          this.combatSystem.getMaxHp(),
          this.combatSystem.getAttack(),
          this.combatSystem.getDefense(),
        );
    };

    const onUseFood = ({ itemId }: { itemId: string }) => {
      if (!this.inventory.hasItem(itemId)) return;
      this.inventory.removeItem(itemId);
      this.energySystem.recover(itemId.startsWith("food-") ? 20 : 10);
      syncInventory();
    };

    const onCombatDefeated = ({
      monsterId,
      drops,
    }: {
      monsterId: string;
      drops: ReadonlyArray<{ itemId: string; quantity: number }>;
    }) => {
      for (const drop of drops) {
        this.inventory.addItem(drop.itemId, drop.quantity);
      }
      syncInventory();
      if (monsterId === BOSS_ID) {
        this.bossCleared = true;
        this.combatSystem.clearMonsters();
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

    eventBus.on("inventory:useFood", onUseFood);
    eventBus.on("inventory:equipped", syncInventory);
    eventBus.on("combat:defeated", onCombatDefeated);
    eventBus.on("combat:playerHit", onCombatPlayerHit);
    eventBus.on("combat:playerDied", onCombatPlayerDied);
    const cleanupShop = setupShopHandlers(this.inventory, syncInventory);
    const cleanupReward = setupRewardHandler(this.inventory, syncInventory);
    const cleanupTrade = setupTradeHandler(
      this.inventory,
      syncInventory,
      "pirate-cove",
    );

    // 보스 + 호위 스폰
    const toPx = (t: number) =>
      t * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    const boss = this.combatSystem.spawnMonster(
      BOSS_ID,
      toPx(BOSS_SPAWN.x),
      toPx(BOSS_SPAWN.y),
    );
    for (const [id, m] of this.combatSystem.getMonsters()) {
      if (m === boss) this.bossInstanceId = id;
    }
    for (const g of GUARDS) {
      this.combatSystem.spawnMonster(g.id, toPx(g.x), toPx(g.y));
    }

    syncCombatHp();
    this.setupCollision(map);
    this.setupCamera(map);

    this.events.once("shutdown", () => {
      cleanupShop();
      cleanupReward();
      cleanupTrade();
      eventBus.off("inventory:useFood", onUseFood);
      eventBus.off("inventory:equipped", syncInventory);
      eventBus.off("combat:defeated", onCombatDefeated);
      eventBus.off("combat:playerHit", onCombatPlayerHit);
      eventBus.off("combat:playerDied", onCombatPlayerDied);
      saveManager.patchSave({
        equippedTools: this.inventory.getEquipped(),
        inventory: [...this.inventory.getSlots()],
        activeQuests: [...this.questSystem.getState().active],
        completedQuests: [...this.questSystem.getState().completed],
        questProgress: this.questSystem.getState().progress,
        playerHp: this.combatSystem.getHp(),
        playerMaxHp: this.combatSystem.getMaxHp(),
      });
      this.inventory.destroy();
      this.combatSystem.destroy();
      this.energySystem.destroy();
      this.questSystem.destroy();
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.combatSystem.update(this, _time, delta);
    this.tickBoss(delta);

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

    const inputState = this.inputManager.getState();
    this.player.update(inputState);
    this.emitPosition(this.player.sprite, _time);

    const actionPressed = inputState.action && !this.prevAction;
    this.prevAction = inputState.action;
    if (actionPressed && this.combatSystem.isAlive()) {
      if (this.energySystem.consume("COMBAT")) {
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

    this.checkExitPortal();
  }

  /** 해적왕 AI: 순수 틱 머신(pirate-king.ts)을 보스 몬스터에 연결 */
  private tickBoss(delta: number): void {
    if (this.bossCleared || !this.bossInstanceId) return;
    const boss = this.combatSystem.getMonsters().get(this.bossInstanceId);
    if (!boss || boss.getHp() <= 0) return;

    const def = boss.definition;
    const dx = this.player.sprite.x - boss.sprite.x;
    const dy = this.player.sprite.y - boss.sprite.y;
    const result = tickPirateKing(this.bossState, {
      hpRatio: boss.getHp() / def.hp,
      playerDistance: Math.sqrt(dx * dx + dy * dy),
      deltaMs: delta,
    });
    this.bossState = result.state;

    // rally: 부하 소환 (최대 횟수 제한)
    if (result.action === "rally" && this.rallyAdds < MAX_RALLY_ADDS) {
      this.rallyAdds += 1;
      const toPx = (t: number) =>
        t * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
      this.combatSystem.spawnMonster("jellyfish", toPx(4), toPx(5));
    }
  }

  private checkExitPortal(): void {
    if (this.isTransitioning) return;
    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE);
    // 하단 입구로 복귀 (보스 처치 여부 무관 — 도망 가능)
    if (tileY >= 24 && tileX >= 9 && tileX <= 10) {
      this.patchAndReturn();
    }
  }

  private patchAndReturn(): void {
    this.isTransitioning = true;
    this.scene.start("IslandScene", { spawnX: 2, spawnY: 27 });
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-pirate")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    // pirate cove: dark wood, sand, water, rock
    const colors = [0x4e342e, 0xd7ccc8, 0x0d47a1, 0x37474f];
    const canvas = this.textures.createCanvas(
      "tileset-pirate",
      size * 2,
      size * 2,
    );
    if (!canvas) return;
    const ctx = canvas.context;
    for (let i = 0; i < colors.length; i++) {
      const x = (i % 2) * size;
      const y = Math.floor(i / 2) * size;
      ctx.fillStyle = `#${colors[i]!.toString(16).padStart(6, "0")}`;
      ctx.fillRect(x, y, size, size);
    }
    canvas.refresh();
  }

  private loadTilemap(): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key: "pirate-map" });
    const tileset = map.addTilesetImage("mountain-tiles", "tileset-pirate");
    if (!tileset) throw new Error("Failed to load pirate tileset");
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
