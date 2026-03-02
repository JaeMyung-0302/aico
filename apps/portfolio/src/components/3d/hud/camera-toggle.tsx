"use client";

import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/hud.module.scss";

export const CameraToggle = () => {
  const cameraMode = useWorldStore((s) => s.cameraMode);
  const setCameraMode = useWorldStore((s) => s.setCameraMode);

  const toggle = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setCameraMode(cameraMode === "first-person" ? "third-person" : "first-person");
  };

  return (
    <button
      className={styles.cameraToggle}
      onClick={toggle}
      type="button"
      title="캐릭터 시점 전환"
    >
      {cameraMode === "first-person" ? "1인칭" : "3인칭"}
    </button>
  );
};
