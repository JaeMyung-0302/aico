"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/hud.module.scss";

const JOYSTICK_RADIUS = 40;

export const MobileControls = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [thumbOffset, setThumbOffset] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0 });
  const setMobileInput = useWorldStore((s) => s.setMobileInput);

  useEffect(() => {
    setIsMobile(navigator.maxTouchPoints > 0);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(distance, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * clamped;
    const y = Math.sin(angle) * clamped;
    setThumbOffset({ x, y });
    setMobileInput({ moveX: x / JOYSTICK_RADIUS, moveY: y / JOYSTICK_RADIUS });
  }, [setMobileInput]);

  const onTouchEnd = useCallback(() => {
    setThumbOffset({ x: 0, y: 0 });
    setMobileInput(null);
  }, [setMobileInput]);

  if (!isMobile) return null;

  return (
    <div className={styles.mobileControls}>
      <div
        className={`${styles.joystickZone} ${styles.left}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className={styles.joystickBase}>
          <div
            className={styles.joystickThumb}
            style={{
              transform: `translate(calc(-50% + ${thumbOffset.x}px), calc(-50% + ${thumbOffset.y}px))`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
