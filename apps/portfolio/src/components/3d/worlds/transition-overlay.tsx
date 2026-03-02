"use client";

import { worldConfigs } from "@/content/worlds";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/transition.module.scss";

export const TransitionOverlay = () => {
  const isTransitioning = useWorldStore((s) => s.isTransitioning);
  const currentWorld = useWorldStore((s) => s.currentWorld);

  if (!isTransitioning) return null;

  const config = worldConfigs.get(currentWorld);
  const name = config?.name ?? currentWorld;

  return (
    <div className={styles.overlay}>
      <span className={styles.worldName}>{name}</span>
    </div>
  );
};
