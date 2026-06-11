import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";
import { useGameStore, type FarmDecorationState } from "@/stores/useGameStore";
import {
  canPlace,
  type FarmLayout,
  type ReservedTile,
} from "./farm-decoration";
import { canAfford, getCatalogItem } from "./farm-decoration-catalog";

/** 장식별 표시 이모지 (스프라이트 에셋 대신 텍스트 렌더링) */
const DECO_EMOJI: Readonly<Record<string, string>> = {
  "deco-flower-bed": "🌸", // 🌸
  "deco-maple-tree": "🍁", // 🍁
  "deco-bamboo-grove": "🎍", // 🎍
  "deco-garden-stone": "🪨", // 🪨
  "deco-stone-lantern": "🗿", // 🗿
  "deco-fence-short": "🪵", // 🪵
  "deco-wooden-bench": "🪑", // 🪑
  "deco-paper-lantern": "🏮", // 🏮
  "deco-festival-banner": "🎏", // 🎏
};

interface DecorationSceneContext {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly getPlayerTile: () => { x: number; y: number };
  readonly isTileBlocked: (tileX: number, tileY: number) => boolean;
}

const toLayout = (
  ctx: DecorationSceneContext,
  placements: ReadonlyArray<FarmDecorationState>,
): FarmLayout => ({
  width: ctx.mapWidth,
  height: ctx.mapHeight,
  placements,
});

/** 발자국 내 충돌 타일만 reserved로 수집 (전체 맵 스캔 회피) */
const reservedInFootprint = (
  ctx: DecorationSceneContext,
  tileX: number,
  tileY: number,
  w: number,
  h: number,
): ReservedTile[] => {
  const reserved: ReservedTile[] = [];
  for (let y = tileY; y < tileY + h; y++) {
    for (let x = tileX; x < tileX + w; x++) {
      if (ctx.isTileBlocked(x, y)) {
        reserved.push({ x, y });
      }
    }
  }
  return reserved;
};

/**
 * 농장 꾸미기 런타임 (Ch.6): 카탈로그 구매 → 플레이어 발 밑 타일에 배치.
 * 골드 차감 + store/세이브 영속 + 씬 이모지 렌더링. FarmScene 전용.
 * 반환된 cleanup을 shutdown에서 호출할 것.
 */
export const setupFarmDecorations = (
  scene: Phaser.Scene,
  ctx: DecorationSceneContext,
): (() => void) => {
  const sprites = new Map<string, Phaser.GameObjects.Text>();
  const size = GAME_CONSTANTS.TILE_SIZE;

  const render = (p: FarmDecorationState): void => {
    const text = scene.add.text(
      p.tileX * size + (p.w * size) / 2,
      p.tileY * size + (p.h * size) / 2,
      DECO_EMOJI[p.itemId] ?? "❓",
      { fontSize: `${Math.min(p.w, p.h) * size * 0.8}px` },
    );
    text.setOrigin(0.5);
    text.setDepth(5);
    sprites.set(p.instanceId, text);
  };

  // 세이브 복원분 렌더링
  for (const p of useGameStore.getState().farmDecorations) {
    render(p);
  }

  const onPlace = ({ itemId }: { itemId: string }): void => {
    const item = getCatalogItem(itemId);
    if (!item) return;

    const store = useGameStore.getState();
    if (!canAfford(store.gold, itemId).ok) return;

    // 플레이어 발 밑(한 칸 아래가 아닌 현재 타일)을 좌상단으로 배치
    const tile = ctx.getPlayerTile();
    const layout = toLayout(ctx, store.farmDecorations);
    const reserved = reservedInFootprint(ctx, tile.x, tile.y, item.w, item.h);
    const check = canPlace(layout, item, tile.x, tile.y, reserved);
    if (!check.ok) return;

    const placement: FarmDecorationState = {
      instanceId: crypto.randomUUID(),
      itemId,
      tileX: tile.x,
      tileY: tile.y,
      w: item.w,
      h: item.h,
    };
    store.setGold(store.gold - item.cost);
    store.setFarmDecorations([...store.farmDecorations, placement]);
    render(placement);
    eventBus.emit("decoration:placed", {
      instanceId: placement.instanceId,
      itemId,
      tileX: tile.x,
      tileY: tile.y,
    });
  };

  const onRemove = ({ instanceId }: { instanceId: string }): void => {
    const store = useGameStore.getState();
    if (!store.farmDecorations.some((p) => p.instanceId === instanceId)) {
      return;
    }
    store.setFarmDecorations(
      store.farmDecorations.filter((p) => p.instanceId !== instanceId),
    );
    sprites.get(instanceId)?.destroy();
    sprites.delete(instanceId);
  };

  eventBus.on("decoration:place", onPlace);
  eventBus.on("decoration:remove", onRemove);
  return () => {
    eventBus.off("decoration:place", onPlace);
    eventBus.off("decoration:remove", onRemove);
    for (const text of sprites.values()) {
      text.destroy();
    }
    sprites.clear();
  };
};
