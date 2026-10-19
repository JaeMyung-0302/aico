import { useGameStore } from "@/stores/useGameStore";
import { eventBus } from "@/lib/event-bus";
import { getItemName } from "@/ui/item-names";
import { t } from "@/i18n";
import { PRICE_TABLE, type Port } from "@/game/systems/trade-prices";

// 씬 → 항구 매핑. 항구가 없는 씬에서는 안내문만 표시.
const SCENE_PORTS: Readonly<Record<string, Port>> = {
  MarketScene: "village",
  IslandScene: "island",
  PirateScene: "pirate-cove",
};

interface Props {
  readonly open: boolean;
}

const TradePanel = ({ open }: Props) => {
  const { gold, inventory, currentScene } = useGameStore();

  if (!open) return null;

  const port = SCENE_PORTS[currentScene];

  const ownedCount = (itemId: string): number =>
    inventory.reduce(
      (sum, slot) => (slot?.itemId === itemId ? sum + slot.quantity : sum),
      0,
    );

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>🚢 {t("ui.trade.title")}</span>
        <span style={styles.goldBadge}>{gold.toLocaleString()}G</span>
      </div>
      {!port ? (
        <div style={styles.empty}>{t("ui.trade.noPort")}</div>
      ) : (
        <div style={styles.list}>
          {PRICE_TABLE[port].map((entry) => {
            const owned = ownedCount(entry.itemId);
            return (
              <div key={entry.itemId} style={styles.row}>
                <span style={styles.itemName}>
                  {getItemName(entry.itemId)}
                  <span style={styles.owned}>
                    {" "}
                    ({t("ui.trade.owned")} {owned})
                  </span>
                </span>
                <button
                  style={{
                    ...styles.buyBtn,
                    opacity: gold >= entry.buyPrice ? 1 : 0.4,
                  }}
                  disabled={gold < entry.buyPrice}
                  onClick={() =>
                    eventBus.emit("trade:buy", { itemId: entry.itemId })
                  }
                >
                  {t("ui.trade.buy")} {entry.buyPrice}G
                </button>
                <button
                  style={{ ...styles.sellBtn, opacity: owned > 0 ? 1 : 0.4 }}
                  disabled={owned === 0}
                  onClick={() =>
                    eventBus.emit("trade:sell", { itemId: entry.itemId })
                  }
                >
                  {t("ui.trade.sell")} {entry.sellPrice}G
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    top: 60,
    left: "50%",
    transform: "translateX(-50%)",
    width: 320,
    maxHeight: 420,
    background: "linear-gradient(135deg, #102a43, #1c3d5a)",
    borderRadius: 12,
    padding: 12,
    zIndex: 250,
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontWeight: 700, fontSize: 15 },
  goldBadge: {
    background: "rgba(255, 215, 0, 0.2)",
    color: "#ffd700",
    padding: "2px 8px",
    borderRadius: 8,
    fontSize: 13,
  },
  empty: { padding: 16, textAlign: "center", fontSize: 13, opacity: 0.8 },
  list: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: "6px 8px",
  },
  itemName: { flex: 1, fontSize: 13 },
  owned: { fontSize: 11, opacity: 0.7 },
  buyBtn: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
  },
  sellBtn: {
    background: "#c62828",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
  },
};

export default TradePanel;
