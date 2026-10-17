import { useEffect, useState } from "react";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";
import { saveManager } from "@/lib/save-manager";
import {
  canStartNgPlus,
  startNgPlusCycle,
} from "@/game/systems/new-game-plus-runtime";

/** 최종 보스 처치 시 멀티 엔딩 연출 (Ch.5) — ending:reached 이벤트로 표시 */
const EndingOverlay = () => {
  const [endingId, setEndingId] = useState<string | null>(null);

  useEffect(() => {
    const onEnding = ({ endingId: id }: { endingId: string }) => {
      setEndingId(id);
    };
    eventBus.on("ending:reached", onEnding);
    return () => {
      eventBus.off("ending:reached", onEnding);
    };
  }, []);

  if (!endingId) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.title}>{t(`ending.${endingId}.title` as never)}</div>
        <div style={styles.body}>{t(`ending.${endingId}.body` as never)}</div>
        <div style={styles.credits}>{t("ui.ending.credits")}</div>
        <button style={styles.btn} onClick={() => setEndingId(null)}>
          {t("ui.ending.continue")}
        </button>
        {canStartNgPlus(true) && (
          <button
            style={styles.ngBtn}
            onClick={() => {
              const next = startNgPlusCycle();
              saveManager.deleteSave();
              console.info(`[NG+] cycle ${next.cycleCount} 시작`);
              window.location.reload();
            }}
          >
            🔄 {t("ui.ending.newGamePlus")}
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 900,
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  box: {
    width: 320,
    padding: 24,
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    borderRadius: 16,
    color: "#fff",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    border: "1px solid rgba(255, 215, 0, 0.4)",
  },
  title: { fontSize: 18, fontWeight: 700, color: "#ffd700" },
  body: { fontSize: 13, lineHeight: 1.7, opacity: 0.95 },
  credits: { fontSize: 11, opacity: 0.6 },
  ngBtn: {
    background: "transparent",
    color: "#ffd700",
    border: "1px solid #ffd700",
    borderRadius: 8,
    padding: "8px 0",
    cursor: "pointer",
    fontWeight: 700,
  },
  btn: {
    background: "#ffd700",
    color: "#1a1a2e",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    cursor: "pointer",
    fontWeight: 700,
  },
};

export default EndingOverlay;
