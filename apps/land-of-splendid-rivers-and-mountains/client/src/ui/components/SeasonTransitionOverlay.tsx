import { useState, useEffect } from "react";
import type { Season } from "@land-of-splendid-rivers-and-mountains/shared";
import { eventBus } from "@/lib/event-bus";

const SEASON_ICONS: Readonly<Record<Season, string>> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
};

const SEASON_NAMES: Readonly<Record<Season, string>> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

type Phase = "hidden" | "fadeIn" | "display" | "fadeOut";

const SeasonTransitionOverlay = () => {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [toSeason, setToSeason] = useState<Season>("spring");
  const [witheredCount, setWitheredCount] = useState(0);

  useEffect(() => {
    const onTransitionStart = ({
      to,
    }: {
      from: Season;
      to: Season;
      year: number;
    }) => {
      setToSeason(to);
      setWitheredCount(0);
      setPhase("fadeIn");
    };

    const onWithered = ({ count }: { count: number }) => {
      setWitheredCount(count);
    };

    eventBus.on("season:transitionStart", onTransitionStart);
    eventBus.on("farm:withered", onWithered);

    return () => {
      eventBus.off("season:transitionStart", onTransitionStart);
      eventBus.off("farm:withered", onWithered);
    };
  }, []);

  useEffect(() => {
    if (phase === "hidden") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === "fadeIn") {
      timers.push(setTimeout(() => setPhase("display"), 800));
    } else if (phase === "display") {
      timers.push(setTimeout(() => setPhase("fadeOut"), 1500));
    } else if (phase === "fadeOut") {
      timers.push(setTimeout(() => setPhase("hidden"), 800));
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [phase]);

  if (phase === "hidden") return null;

  const opacity = phase === "fadeIn" || phase === "fadeOut" ? 0.5 : 1;

  return (
    <div
      style={{ ...styles.overlay, opacity, transition: "opacity 0.8s ease" }}
    >
      <div style={styles.content}>
        <div style={styles.icon}>{SEASON_ICONS[toSeason]}</div>
        <div style={styles.seasonName}>{SEASON_NAMES[toSeason]}</div>
        {witheredCount > 0 && (
          <div style={styles.withered}>
            {witheredCount}개의 작물이 시들었습니다
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.7)",
    zIndex: 900,
    pointerEvents: "none",
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  content: {
    textAlign: "center" as const,
    color: "#fff",
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  seasonName: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 4,
    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },
  withered: {
    marginTop: 12,
    fontSize: 14,
    color: "#fbbf24",
    opacity: 0.9,
  },
};

export default SeasonTransitionOverlay;
