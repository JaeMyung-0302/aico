"use client";

import { useEffect } from "react";

import { tourStops } from "@/content/tour-stops";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/tour.module.scss";

export const TourControls = () => {
  const tourActive = useWorldStore((s) => s.tourActive);
  const tourStopIndex = useWorldStore((s) => s.tourStopIndex);
  const nextStop = useWorldStore((s) => s.nextStop);
  const prevStop = useWorldStore((s) => s.prevStop);
  const exitTour = useWorldStore((s) => s.exitTour);

  useEffect(() => {
    if (!tourActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        exitTour();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        nextStop();
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        prevStop();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tourActive, nextStop, prevStop, exitTour]);

  if (!tourActive) return null;

  const currentStop = tourStops[tourStopIndex];
  const isFirst = tourStopIndex === 0;
  const isLast = tourStopIndex === tourStops.length - 1;

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.navButton}
        disabled={isFirst}
        onClick={prevStop}
        aria-label="이전 프로젝트"
      >
        ◀
      </button>

      <div className={styles.info}>
        <span className={styles.stopName}>{currentStop?.title}</span>
        <div className={styles.dots}>
          {tourStops.map((stop, i) => (
            <span
              key={stop.slug}
              className={`${styles.dot} ${i === tourStopIndex ? styles.active : ""}`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.navButton}
        disabled={isLast}
        onClick={nextStop}
        aria-label="다음 프로젝트"
      >
        ▶
      </button>

      <button
        type="button"
        className={styles.exitButton}
        onClick={exitTour}
      >
        자유 탐색
      </button>
    </div>
  );
};
