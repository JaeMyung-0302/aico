import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { Player } from "../entities/Player";
import { InputManager } from "../input/input-manager";
import { KeyboardInput } from "../input/keyboard-input";
import { TouchInput } from "../input/touch-input";
import { CombatSystem } from "../systems/combat";
import { EnergySystem } from "../systems/energy";
import { InventorySystem } from "../systems/inventory";
import { setupRewardHandler } from "../systems/reward";
import { setupShopHandlers } from "../systems/shop";
import {
  generateFloor,
  type DungeonFloor,
} from "../systems/infinite-dungeon-floor";
import {
  MILESTONE_FLOORS,
  isBossFloor,
} from "../systems/infinite-dungeon-progression";
import {
  abandonRun,
  advanceFloor,
  collectGold,
  createInitialRun,
  failRun,
  startRun,
  type DungeonRunState,
} from "../systems/dungeon-run-state";
import { createPositionEmitter } from "../utils/position-emitter";
import { eventBus } from "@/lib/event-bus";
import { saveManager } from "@/lib/save-manager";
import { useGameStore } from "@/stores/useGameStore";

const FLOOR_W = 24;
const FLOOR_H = 24;
const TARGET_ROOMS = 5;
// 층 구간별 몬스터 풀 (스폰 스탯 스케일 대신 종 교체로 난이도 상승)
const POOLS: ReadonlyArray<{ min: number; ids: ReadonlyArray<string> }> = [
  { min: 15, ids: ["jangsan", "gumiho", "gwishin"] },
  { min: 8, ids: ["gwishin", "gumiho", "dokkaebi"] },
  { min: 0, ids: ["cheuksin", "dokkaebi"] },
];
const BOSS_ID = "imugi";
const GOLD_PER_FLOOR_BASE = 30;

export class InfiniteDungeonScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private keyboardInput!: KeyboardInput;
  private touchInput!: TouchInput;
  private combatSystem!: CombatSystem;
  private energySystem!: EnergySystem;
  private inventory!: InventorySystem;
  private run: DungeonRunState = createInitialRun();
  private floor: DungeonFloor | null = null;
  private monstersAlive = 0;
  private floorCleared = false;
  private isTransitioning = false;
  private prevAction = false;
  private wallLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private currentMap: Phaser.Tilemaps.Tilemap | null = null;
  private readonly emitPosition = createPositionEmitter("InfiniteDungeonScene");

  constructor() {
    super({ key: "InfiniteDungeonScene" });
  }

  preload(): void {
    this.createTilesetTexture();
  }

  create(): void {
    this.isTransitioning = false;
    this.prevAction = false;
    this.run = startRun(createInitialRun());

    this.inputManager = new InputManager();
    this.keyboardInput = new KeyboardInput();
    this.touchInput = new TouchInput();
    this.keyboardInput.init(this);
    this.touchInput.init(this);

    this.player = new Player(this, 0, 0);
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
      this.combatSystem.equipWeapon(
        toolId ? toolId.replace("tool-", "weapon-") : "weapon-fist",
      );
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

    const onCombatDefeated = ({
      drops,
    }: {
      monsterId: string;
      drops: ReadonlyArray<{ itemId: string; quantity: number }>;
    }) => {
      this.monstersAlive -= 1;
      for (const drop of drops) {
        this.inventory.addItem(drop.itemId, drop.quantity);
      }
      syncInventory();
      if (this.monstersAlive <= 0) {
        this.onFloorCleared();
      }
    };

    const onCombatPlayerHit = () => syncCombatHp();

    const onCombatPlayerDied = () => {
      this.isTransitioning = true;
      this.combatSystem.clearMonsters();
      const { result } = failRun(this.run);
      this.run = createInitialRun();
      this.time.delayedCall(800, () => {
        syncCombatHp();
        // 실패: 수집 골드 절반만 지급
        const g = useGameStore.getState().gold;
        const payout = Math.floor(result.gold / 2);
        if (payout > 0) {
          eventBus.emit("gold:changed", { amount: payout, total: g + payout });
        }
        this.exitToVillage();
      });
    };

    eventBus.on("combat:defeated", onCombatDefeated);
    eventBus.on("combat:playerHit", onCombatPlayerHit);
    eventBus.on("combat:playerDied", onCombatPlayerDied);
    // 도감 마일스톤 등 event:reward가 이 씬에서도 유실되지 않도록 등록
    const cleanupReward = setupRewardHandler(this.inventory, syncInventory);
    const cleanupShop = setupShopHandlers(this.inventory, syncInventory);

    this.events.once("shutdown", () => {
      cleanupReward();
      cleanupShop();
      eventBus.off("combat:defeated", onCombatDefeated);
      eventBus.off("combat:playerHit", onCombatPlayerHit);
      eventBus.off("combat:playerDied", onCombatPlayerDied);
      saveManager.patchSave({
        equippedTools: this.inventory.getEquipped(),
        inventory: [...this.inventory.getSlots()],
        playerHp: this.combatSystem.getHp(),
        playerMaxHp: this.combatSystem.getMaxHp(),
      });
      this.inventory.destroy();
      this.combatSystem.destroy();
      this.energySystem.destroy();
      this.keyboardInput.destroy();
      this.touchInput.destroy();
      this.player.destroy();
    });

    this.buildFloor();
  }

  /** 시드 기반 층 생성: 룸 = 바닥, L자 복도로 연결, 밖은 벽 */
  private buildFloor(): void {
    const floorNum = this.run.currentFloor;
    this.floor = generateFloor({
      seed: floorNum * 7919 + 17,
      width: FLOOR_W,
      height: FLOOR_H,
      targetRooms: TARGET_ROOMS,
    });
    const f = this.floor;

    // 0 = 벽, 1 = 바닥
    const grid: number[][] = Array.from({ length: FLOOR_H }, () =>
      Array.from({ length: FLOOR_W }, () => 0),
    );
    const carveRoom = (r: { x: number; y: number; w: number; h: number }) => {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (grid[y]?.[x] !== undefined) grid[y]![x] = 1;
        }
      }
    };
    const center = (r: { x: number; y: number; w: number; h: number }) => ({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2),
    });
    const carveCorridor = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => {
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        if (grid[a.y]?.[x] !== undefined) grid[a.y]![x] = 1;
      }
      for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
        if (grid[y]?.[b.x] !== undefined) grid[y]![b.x] = 1;
      }
    };
    for (const room of f.rooms) carveRoom(room);
    for (let i = 1; i < f.rooms.length; i++) {
      carveCorridor(center(f.rooms[i - 1]!), center(f.rooms[i]!));
    }

    // 타일맵 재구성 (1=바닥 gid1, 0=벽 gid2)
    this.currentMap?.destroy();
    this.wallLayer?.destroy();
    const data = grid.map((row) => row.map((v) => (v === 1 ? 0 : 1)));
    const map = this.make.tilemap({
      data,
      tileWidth: GAME_CONSTANTS.TILE_SIZE,
      tileHeight: GAME_CONSTANTS.TILE_SIZE,
    });
    const tiles = map.addTilesetImage("tileset-infinite");
    if (!tiles) throw new Error("infinite tileset missing");
    const layer = map.createLayer(0, tiles, 0, 0);
    if (!layer) throw new Error("infinite layer failed");
    layer.setDepth(0);
    layer.setCollision(1); // 벽 충돌
    this.physics.add.collider(this.player.sprite, layer);
    this.wallLayer = layer;
    this.currentMap = map;

    // 플레이어를 입구 룸 중앙으로
    const size = GAME_CONSTANTS.TILE_SIZE;
    const entry = center(f.rooms[f.entryRoomIndex]!);
    this.player.sprite.setPosition(
      entry.x * size + size / 2,
      entry.y * size + size / 2,
    );

    // 몬스터 스폰: 입구/출구 제외 룸들 + 보스층이면 보스
    this.combatSystem.clearMonsters();
    this.monstersAlive = 0;
    this.floorCleared = false;
    const pool = POOLS.find((p) => floorNum >= p.min)!.ids;
    f.rooms.forEach((room, i) => {
      if (i === f.entryRoomIndex) return;
      const c = center(room);
      const id = pool[(floorNum + i) % pool.length]!;
      this.combatSystem.spawnMonster(
        id,
        c.x * size + size / 2,
        c.y * size + size / 2,
      );
      this.monstersAlive += 1;
    });
    if (isBossFloor(floorNum)) {
      const c = center(f.rooms[f.exitRoomIndex]!);
      this.combatSystem.spawnMonster(
        BOSS_ID,
        c.x * size + size / 2,
        (c.y - 1) * size + size / 2,
      );
      this.monstersAlive += 1;
    }

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    useGameStore.getState().setDungeonFloor(floorNum, 999);
  }

  private onFloorCleared(): void {
    if (this.floorCleared) return;
    this.floorCleared = true;
    const floorNum = this.run.currentFloor;

    // 층 보상 골드 적립 (수집 — 이탈/완주 시 지급)
    this.run = collectGold(
      this.run,
      Math.floor(GOLD_PER_FLOOR_BASE * (1 + floorNum * 0.08)),
    );

    // 마일스톤 보상 즉시 지급
    const milestone = MILESTONE_FLOORS.find((m) => m.floor === floorNum);
    if (milestone) {
      eventBus.emit("event:reward", {
        eventId: `dungeon-milestone-${floorNum}`,
        goldReward: 0,
        items: [{ itemId: milestone.itemId, quantity: milestone.quantity }],
      });
      this.inventory.addItem(milestone.itemId, milestone.quantity);
    }
  }

  update(_time: number, delta: number): void {
    this.combatSystem.update(this, _time, delta);

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

    this.checkExit();
  }

  /** 층 클리어 후 출구 룸 중앙 도달 → 다음 층 / ESC 패널 없이 이탈은 입구 룸 복귀 */
  private checkExit(): void {
    if (this.isTransitioning || !this.floor) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    const tileX = Math.floor(this.player.sprite.x / size);
    const tileY = Math.floor(this.player.sprite.y / size);
    const f = this.floor;
    const exit = f.rooms[f.exitRoomIndex]!;
    const inExit =
      tileX >= exit.x &&
      tileX < exit.x + exit.w &&
      tileY >= exit.y &&
      tileY < exit.y + exit.h;
    const entry = f.rooms[f.entryRoomIndex]!;
    const inEntry =
      tileX >= entry.x &&
      tileX < entry.x + entry.w &&
      tileY >= entry.y &&
      tileY < entry.y + entry.h;

    if (this.floorCleared && inExit) {
      this.run = advanceFloor(this.run);
      this.buildFloor();
      return;
    }
    // 클리어 후 입구로 돌아오면 이탈 (수집 골드 전액 지급)
    if (this.floorCleared && inEntry && this.run.currentFloor > 1) {
      this.isTransitioning = true;
      const { result } = abandonRun(this.run);
      this.run = createInitialRun();
      const g = useGameStore.getState().gold;
      if (result.gold > 0) {
        eventBus.emit("gold:changed", {
          amount: result.gold,
          total: g + result.gold,
        });
      }
      this.exitToVillage();
    }
  }

  private exitToVillage(): void {
    this.scene.start("VillageScene", { spawnX: 14, spawnY: 2 });
  }

  private createTilesetTexture(): void {
    if (this.textures.exists("tileset-infinite")) return;
    const size = GAME_CONSTANTS.TILE_SIZE;
    const colors = [0x4a4458, 0x211f2b]; // 바닥, 벽
    const canvas = this.textures.createCanvas(
      "tileset-infinite",
      size * 2,
      size,
    );
    if (!canvas) return;
    const ctx = canvas.context;
    colors.forEach((c, i) => {
      ctx.fillStyle = `#${c.toString(16).padStart(6, "0")}`;
      ctx.fillRect(i * size, 0, size, size);
    });
    canvas.refresh();
  }
}
