"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/styles/hud.module.scss";

const AUTO_DISMISS_MS = 10000;

export const ControlsGuide = () => {
  const [visible, setVisible] = useState(true);
  const isMobile =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    const onKeyDown = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        dismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss]);

  if (!visible) {
    return (
      <button
        className={styles.reopenButton}
        onClick={() => setVisible(true)}
        type="button"
      >
        ?
      </button>
    );
  }

  return (
    <div className={styles.controlsGuide}>
      {isMobile ? (
        <>
          <span className={styles.controlItem}>
            왼쪽 조이스틱: 이동
          </span>
          <span className={styles.controlItem}>
            오른쪽 드래그: 시야 회전
          </span>
        </>
      ) : (
        <>
          <span className={styles.controlItem}>
            <span className={styles.key}>W</span>
            <span className={styles.key}>A</span>
            <span className={styles.key}>S</span>
            <span className={styles.key}>D</span>
            이동
          </span>
          <span className={styles.controlItem}>
            <span className={styles.key}>Shift</span>
            달리기
          </span>
          <span className={styles.controlItem}>
            <span className={styles.key}>Space</span>
            점프
          </span>
          <span className={styles.controlItem}>
            마우스: 시야 회전
          </span>
        </>
      )}
    </div>
  );
};
