import { useGameStore } from "@/stores/useGameStore";
import { t } from "@/i18n";
import {
  DEX_CATEGORIES,
  DEX_MILESTONES,
  getCategoryCompletion,
  getOverallCompletion,
} from "@/game/systems/dex-rewards";

interface Props {
  readonly open: boolean;
}

/** 도감 패널 (Ch.6): 카테고리별 발견률 + 마일스톤 보상 현황 */
const DexPanel = ({ open }: Props) => {
  const { dexDiscovered, dexMilestonesGranted } = useGameStore();

  if (!open) return null;

  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(dexDiscovered)) {
    counts[k] = v.length;
  }
  const progress = { discoveredByCategory: counts };
  const overall = getOverallCompletion(DEX_CATEGORIES, progress);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        📖 {t("ui.dex.title")} — {overall.toFixed(0)}%
      </div>
      <div style={styles.list}>
        {DEX_CATEGORIES.map((cat) => {
          const pct = getCategoryCompletion(cat, progress);
          const discovered = counts[cat.id] ?? 0;
          return (
            <div key={cat.id} style={styles.row}>
              <div style={styles.catName}>{t(cat.nameKey as never)}</div>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${pct}%` }} />
              </div>
              <div style={styles.count}>
                {discovered}/{cat.totalEntries}
              </div>
            </div>
          );
        })}
        <div style={styles.subHeader}>{t("ui.dex.milestones")}</div>
        {DEX_MILESTONES.map((m) => {
          const achieved = dexMilestonesGranted.includes(m.percent);
          return (
            <div key={m.percent} style={styles.row}>
              <div style={{ ...styles.catName, opacity: achieved ? 1 : 0.5 }}>
                {achieved ? "🏅" : "🔒"} {m.percent}% — {t(m.titleKey as never)}
              </div>
            </div>
          );
        })}
      </div>
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
    background: "linear-gradient(135deg, #1a237e, #283593)",
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
  list: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    padding: "6px 10px",
  },
  catName: { fontSize: 12, fontWeight: 700, minWidth: 60 },
  barWrap: {
    flex: 1,
    height: 8,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: { height: "100%", background: "#4ade80", borderRadius: 4 },
  count: { fontSize: 11, opacity: 0.85, minWidth: 36, textAlign: "right" },
};

export default DexPanel;
