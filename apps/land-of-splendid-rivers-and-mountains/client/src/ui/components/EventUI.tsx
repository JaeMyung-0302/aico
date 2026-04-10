import { useState, useEffect, useCallback } from "react";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";

interface RewardInfo {
  readonly eventId: string;
  readonly goldReward: number;
  readonly items: ReadonlyArray<{ itemId: string; quantity: number }>;
}

const EventUI = () => {
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);

  useEffect(() => {
    const onStarted = ({ eventId }: { eventId: string }) => {
      setActiveEventId(eventId);
    };
    const onCompleted = () => {
      setActiveEventId(null);
    };
    const onReward = (data: RewardInfo) => {
      setReward(data);
    };

    eventBus.on("event:started", onStarted);
    eventBus.on("event:completed", onCompleted);
    eventBus.on("event:reward", onReward);

    return () => {
      eventBus.off("event:started", onStarted);
      eventBus.off("event:completed", onCompleted);
      eventBus.off("event:reward", onReward);
    };
  }, []);

  const dismissReward = useCallback(() => {
    setReward(null);
  }, []);

  if (reward) {
    return (
      <div style={styles.overlay}>
        <div style={styles.rewardBox}>
          <div style={styles.rewardTitle}>{t("ui.event.rewardTitle")}</div>
          <div style={styles.rewardName}>
            {t(`${reward.eventId}.name` as never) || reward.eventId}
          </div>
          {reward.goldReward > 0 && (
            <div style={styles.rewardGold}>+{reward.goldReward}G</div>
          )}
          {reward.items.map((item, i) => (
            <div key={i} style={styles.rewardItem}>
              {t(`item.${item.itemId.replace("-", ".")}` as never) ||
                item.itemId}{" "}
              x{item.quantity}
            </div>
          ))}
          <button
            type="button"
            style={styles.rewardBtn}
            onClick={dismissReward}
          >
            {t("ui.event.close")}
          </button>
        </div>
      </div>
    );
  }

  if (!activeEventId) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.bannerIcon}>🎊</div>
      <div style={styles.bannerText}>
        <div style={styles.bannerTitle}>
          {t(`event.${activeEventId}` as never)}
        </div>
        <div style={styles.bannerDesc}>
          {t(`event.${activeEventId}.desc` as never)}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: "absolute",
    top: 60,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background:
      "linear-gradient(135deg, rgba(139, 69, 19, 0.9), rgba(184, 115, 51, 0.9))",
    borderRadius: 8,
    padding: "6px 14px",
    color: "#fff",
    fontFamily: '"Noto Sans KR", sans-serif',
    zIndex: 150,
    pointerEvents: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerText: {
    display: "flex",
    flexDirection: "column",
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  bannerDesc: {
    fontSize: 10,
    opacity: 0.85,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.5)",
    zIndex: 500,
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  rewardBox: {
    background: "linear-gradient(135deg, #8b4513, #a0522d)",
    borderRadius: 12,
    padding: "16px 24px",
    color: "#fff",
    textAlign: "center" as const,
    minWidth: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.9,
  },
  rewardGold: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fbbf24",
    marginBottom: 4,
  },
  rewardItem: {
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 2,
  },
  rewardBtn: {
    marginTop: 12,
    padding: "6px 20px",
    borderRadius: 6,
    border: "none",
    background: "#d97706",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    cursor: "pointer",
  },
};

export default EventUI;
