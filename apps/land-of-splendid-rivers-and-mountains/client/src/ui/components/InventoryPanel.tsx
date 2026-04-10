import { memo, useCallback } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { getItemName } from "@/ui/item-names";
import { t } from "@/i18n";
import { eventBus } from "@/lib/event-bus";
import itemsData from "@/game/data/items.json";
import type { ItemDefinition } from "@land-of-splendid-rivers-and-mountains/shared";

const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
);

const TYPE_COLORS: Readonly<Record<string, string>> = {
  seed: "#8B4513",
  crop: "#228B22",
  tool: "#708090",
  material: "#A0522D",
  food: "#FF6347",
};

const ICON_FOLDER: Readonly<Record<string, string>> = {
  tool: "tools",
  seed: "seeds",
  crop: "crops",
  material: "materials",
  food: "foods",
  fish: "fish",
  drop: "drops",
};

const ICON_PREFIX: Readonly<Record<string, string>> = {
  tool: "tool-",
  seed: "seed-",
  crop: "crop-",
  food: "food-",
  fish: "fish-",
  drop: "drop-",
};

const getIconPath = (itemId: string): string => {
  const def = itemMap.get(itemId);
  const folder = def ? (ICON_FOLDER[def.type] ?? "items") : "items";
  const prefix = def ? (ICON_PREFIX[def.type] ?? "") : "";
  const fileName =
    prefix && itemId.startsWith(prefix) ? itemId.slice(prefix.length) : itemId;
  return `assets/icons/${folder}/${fileName}.png`;
};

const COLS = 6;
const TOTAL_SLOTS = 36;

interface Props {
  readonly open: boolean;
}

const InventoryPanel = memo(({ open }: Props) => {
  const inventory = useGameStore((s) => s.inventory);
  const equippedTools = useGameStore((s) => s.equippedTools);
  const gold = useGameStore((s) => s.gold);

  const handleSlotClick = useCallback(
    (itemId: string, isEquipped: boolean, def: ItemDefinition | undefined) => {
      if (!def) return;

      // Food consumption — request scene to handle energy recovery
      if (def.type === "food") {
        eventBus.emit("inventory:useFood", { itemId });
        return;
      }

      if (def.type !== "tool" && def.type !== "seed" && itemId !== "fertilizer")
        return;
      const newToolId = isEquipped ? null : itemId;
      useGameStore.getState().setEquippedTools({ current: newToolId });
      eventBus.emit("inventory:equipRequest", { toolId: newToolId });
    },
    [],
  );

  if (!open) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.title}>{t("ui.inventory.title")}</div>
        <div style={styles.goldBadge}>{gold.toLocaleString()}G</div>
      </div>
      <div style={styles.grid}>
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const slot = inventory[i] ?? null;
          const isEquipped =
            slot !== null && slot.itemId === equippedTools.current;
          const def = slot ? itemMap.get(slot.itemId) : null;
          const color = def ? (TYPE_COLORS[def.type] ?? "#666") : "transparent";

          return (
            <div
              key={i}
              style={{
                ...styles.slot,
                borderColor: isEquipped ? "#4ade80" : "rgba(255,255,255,0.2)",
                borderWidth: isEquipped ? 2 : 1,
                cursor:
                  slot &&
                  (def?.type === "tool" ||
                    def?.type === "seed" ||
                    def?.type === "food" ||
                    slot.itemId === "fertilizer")
                    ? "pointer"
                    : "default",
              }}
              title={slot ? getItemName(slot.itemId) : ""}
              onClick={() =>
                handleSlotClick(
                  slot?.itemId ?? "",
                  isEquipped,
                  def ?? undefined,
                )
              }
            >
              {slot && (
                <>
                  <img
                    src={getIconPath(slot.itemId)}
                    alt=""
                    style={styles.itemIcon}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = document.createElement("div");
                      fallback.style.cssText = `width:18px;height:18px;border-radius:3px;background-color:${color}`;
                      target.parentElement?.insertBefore(fallback, target);
                    }}
                  />
                  <span style={styles.itemLabel}>
                    {getItemName(slot.itemId)}
                  </span>
                  {slot.quantity > 1 && (
                    <span style={styles.quantity}>{slot.quantity}</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    bottom: 52,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(20,20,30,0.92)",
    borderRadius: 10,
    padding: "10px 12px",
    zIndex: 120,
    pointerEvents: "auto",
    minWidth: 270,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  goldBadge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fbbf24",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, 40px)`,
    gap: 4,
    justifyContent: "center",
  },
  slot: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderStyle: "solid",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden",
  },
  itemIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  itemLabel: {
    fontSize: 7,
    color: "#ccc",
    marginTop: 1,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 38,
  },
  quantity: {
    position: "absolute" as const,
    bottom: 1,
    right: 2,
    fontSize: 9,
    color: "#fbbf24",
    fontWeight: "bold",
  },
};

export default InventoryPanel;
