import { useGameStore } from "@/stores/useGameStore";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";
import {
  DECORATION_CATALOG,
  canAfford,
} from "@/game/systems/farm-decoration-catalog";

interface Props {
  readonly open: boolean;
}

/** 농장 꾸미기 패널 (Ch.6): 장식 구매 → 플레이어 위치에 배치. 농장 전용 */
const DecorationPanel = ({ open }: Props) => {
  const { currentScene, gold, farmDecorations } = useGameStore();

  if (!open) return null;

  const atFarm = currentScene === "FarmScene";

  return (
    <div style={styles.panel}>
      <div style={styles.header}>🪴 {t("ui.decoration.title")}</div>
      {!atFarm ? (
        <div style={styles.empty}>{t("ui.decoration.noFarm")}</div>
      ) : (
        <div style={styles.list}>
          {DECORATION_CATALOG.map((item) => {
            const affordable = canAfford(gold, item.id).ok;
            return (
              <div key={item.id} style={styles.row}>
                <div style={styles.info}>
                  <div style={styles.name}>{t(item.nameKey as never)}</div>
                  <div style={styles.meta}>
                    {item.w}×{item.h} · {item.cost}G
                  </div>
                </div>
                <button
                  style={{ ...styles.buyBtn, opacity: affordable ? 1 : 0.4 }}
                  disabled={!affordable}
                  onClick={() =>
                    eventBus.emit("decoration:place", { itemId: item.id })
                  }
                >
                  {t("ui.decoration.place")}
                </button>
              </div>
            );
          })}
          {farmDecorations.length > 0 && (
            <>
              <div style={styles.subHeader}>
                {t("ui.decoration.placed")} ({farmDecorations.length})
              </div>
              {farmDecorations.map((p) => (
                <div key={p.instanceId} style={styles.row}>
                  <div style={styles.info}>
                    <div style={styles.name}>
                      {t(
                        (DECORATION_CATALOG.find((c) => c.id === p.itemId)
                          ?.nameKey ?? p.itemId) as never,
                      )}
                    </div>
                    <div style={styles.meta}>
                      ({p.tileX}, {p.tileY})
                    </div>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() =>
                      eventBus.emit("decoration:remove", {
                        instanceId: p.instanceId,
                      })
                    }
                  >
                    {t("ui.decoration.remove")}
                  </button>
                </div>
              ))}
            </>
          )}
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
    width: 330,
    maxHeight: 440,
    background: "linear-gradient(135deg, #1b3a1f, #2e5232)",
    borderRadius: 12,
    padding: 12,
    zIndex: 250,
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  header: { fontWeight: 700, fontSize: 15, marginBottom: 8 },
  subHeader: { fontWeight: 700, fontSize: 13, marginTop: 8, opacity: 0.9 },
  empty: { padding: 16, textAlign: "center", fontSize: 13, opacity: 0.8 },
  list: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    padding: "6px 10px",
  },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: 700 },
  meta: { fontSize: 11, opacity: 0.85, marginTop: 2 },
  buyBtn: {
    background: "#388e3c",
    color: "#fff",
    border: "1px solid #66bb6a",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
  },
  removeBtn: {
    background: "transparent",
    color: "#ef9a9a",
    border: "1px solid #ef9a9a",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 11,
  },
};

export default DecorationPanel;
