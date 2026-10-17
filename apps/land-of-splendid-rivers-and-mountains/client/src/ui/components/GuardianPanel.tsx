import { useGameStore } from "@/stores/useGameStore";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";
import { allGuardians, canSummonGuardian } from "@/game/systems/guardian";
import { GUARDIAN_BONUSES } from "@/game/systems/guardian-bonuses";

interface Props {
  readonly open: boolean;
}

const GuardianPanel = ({ open }: Props) => {
  const {
    currentScene,
    year,
    reputation,
    inventory,
    summonedGuardians,
    defeatedBosses,
  } = useGameStore();

  if (!open) return null;

  const atTemple = currentScene === "TempleScene";
  const itemIds = inventory
    .filter((slot) => slot !== null)
    .map((slot) => slot.itemId);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>🛕 {t("ui.guardian.title")}</div>
      {!atTemple ? (
        <div style={styles.empty}>{t("ui.guardian.noTemple")}</div>
      ) : (
        <div style={styles.list}>
          {allGuardians().map((def) => {
            const summoned = summonedGuardians.includes(def.id);
            const check = canSummonGuardian(def, {
              year,
              reputation,
              inventory: itemIds,
              defeatedBosses: [...defeatedBosses],
            });
            const bonus = GUARDIAN_BONUSES[def.id];
            return (
              <div key={def.id} style={styles.row}>
                <div style={styles.info}>
                  <div style={styles.name}>{t(def.nameKey as never)}</div>
                  <div style={styles.bonus}>
                    HP +{bonus.hpBonus} / 공격 +{bonus.attackBonus} / 방어 +
                    {bonus.defenseBonus}
                  </div>
                  {!summoned && !check.canSummon && (
                    <div style={styles.missing}>
                      {check.missing
                        .map((m) => t(`ui.guardian.missing.${m}` as never))
                        .join(", ")}
                    </div>
                  )}
                </div>
                {summoned ? (
                  <span style={styles.summonedBadge}>
                    ✨ {t("ui.guardian.summoned")}
                  </span>
                ) : (
                  <button
                    style={{
                      ...styles.summonBtn,
                      opacity: check.canSummon ? 1 : 0.4,
                    }}
                    disabled={!check.canSummon}
                    onClick={() =>
                      eventBus.emit("guardian:summon", { guardianId: def.id })
                    }
                  >
                    {t("ui.guardian.summon")}
                  </button>
                )}
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
    width: 330,
    maxHeight: 440,
    background: "linear-gradient(135deg, #3e2723, #5d4037)",
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
  empty: { padding: 16, textAlign: "center", fontSize: 13, opacity: 0.8 },
  list: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    padding: "8px 10px",
  },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: 700 },
  bonus: { fontSize: 11, opacity: 0.85, marginTop: 2 },
  missing: { fontSize: 11, color: "#ef9a9a", marginTop: 2 },
  summonedBadge: { fontSize: 12, color: "#ffd54f" },
  summonBtn: {
    background: "#6d4c41",
    color: "#fff",
    border: "1px solid #a1887f",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
  },
};

export default GuardianPanel;
