import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";

const GAUGE_HEIGHT = 200;
const TARGET_ZONE_HEIGHT = 60;
const CURSOR_SPEED = 2.5;
const REEL_TIMEOUT_MS = 4000;

const styles = {
  overlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    pointerEvents: "auto" as const,
  },
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    minWidth: 80,
  },
  title: {
    color: "#4fc3f7",
    fontSize: 11,
    fontFamily: "monospace",
  },
  gaugeOuter: {
    width: 30,
    height: GAUGE_HEIGHT,
    backgroundColor: "#222",
    borderRadius: 4,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  targetZone: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    backgroundColor: "rgba(76, 175, 80, 0.4)",
    border: "1px solid #4caf50",
  },
  cursor: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  hint: {
    color: "#aaa",
    fontSize: 9,
    fontFamily: "monospace",
    textAlign: "center" as const,
  },
  waitText: {
    color: "#ffd700",
    fontSize: 12,
    fontFamily: "monospace",
  },
  castText: {
    color: "#888",
    fontSize: 11,
    fontFamily: "monospace",
  },
} as const;

const FishingMiniGame = memo(() => {
  const fishingState = useGameStore((s) => s.fishingState);
  const difficulty = useGameStore((s) => s.fishingDifficulty);

  const cursorPosRef = useRef(0);
  const [targetTop, setTargetTop] = useState(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fishingState !== "reeling") return;

    const zoneH = Math.max(30, TARGET_ZONE_HEIGHT - difficulty * 0.3);
    setTargetTop(Math.random() * (GAUGE_HEIGHT - zoneH));
    cursorPosRef.current = 0;
    dirRef.current = 1;

    const speed = CURSOR_SPEED + difficulty * 0.02;

    let prev = performance.now();
    const animate = (now: number) => {
      const dt = now - prev;
      prev = now;
      let next = cursorPosRef.current + dirRef.current * speed * (dt / 16);
      if (next >= GAUGE_HEIGHT - 4) {
        next = GAUGE_HEIGHT - 4;
        dirRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        dirRef.current = 1;
      }
      cursorPosRef.current = next;
      if (cursorElRef.current) {
        cursorElRef.current.style.top = `${next}px`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    timerRef.current = setTimeout(() => {
      eventBus.emit("fishing:reeling", { difficulty: -1 });
    }, REEL_TIMEOUT_MS);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fishingState, difficulty]);

  const handleClick = useCallback(() => {
    if (fishingState !== "reeling") return;

    const zoneH = Math.max(30, TARGET_ZONE_HEIGHT - difficulty * 0.3);
    const pos = cursorPosRef.current;
    const inZone = pos >= targetTop && pos <= targetTop + zoneH;
    eventBus.emit("fishing:reeling", { difficulty: inZone ? difficulty : -1 });

    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [fishingState, difficulty, targetTop]);

  if (fishingState === "idle") return null;

  if (fishingState === "casting") {
    return (
      <div style={styles.overlay}>
        <div style={styles.container}>
          <span style={styles.castText}>{t("ui.fishing.casting")}</span>
        </div>
      </div>
    );
  }

  if (fishingState === "waiting") {
    return (
      <div style={styles.overlay}>
        <div style={styles.container}>
          <span style={styles.waitText}>{t("ui.fishing.waiting")}</span>
          <span style={styles.hint}>{t("ui.fishing.waitHint")}</span>
        </div>
      </div>
    );
  }

  const zoneH = Math.max(30, TARGET_ZONE_HEIGHT - difficulty * 0.3);

  return (
    <div
      style={styles.overlay}
      onClick={handleClick}
      onTouchStart={handleClick}
    >
      <div style={styles.container}>
        <span style={styles.title}>{t("ui.fishing.reel")}</span>
        <div style={styles.gaugeOuter}>
          <div
            style={{ ...styles.targetZone, top: targetTop, height: zoneH }}
          />
          <div ref={cursorElRef} style={{ ...styles.cursor, top: 0 }} />
        </div>
        <span style={styles.hint}>{t("ui.fishing.reelHint")}</span>
      </div>
    </div>
  );
});

FishingMiniGame.displayName = "FishingMiniGame";

export default FishingMiniGame;
