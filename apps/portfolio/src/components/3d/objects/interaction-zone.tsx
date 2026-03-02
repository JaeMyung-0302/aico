"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";

import { useWorldStore } from "@/stores/world-store";

interface InteractionZoneProps {
  readonly targetPosition: readonly [number, number, number];
  readonly radius: number;
  readonly onEnter: () => void;
  readonly onExit: () => void;
}

const HYSTERESIS = 0.5;

export const InteractionZone = ({
  targetPosition,
  radius,
  onEnter,
  onExit,
}: InteractionZoneProps) => {
  const isInsideRef = useRef(false);

  useFrame(() => {
    const [px, py, pz] = useWorldStore.getState().playerPosition;
    const [tx, ty, tz] = targetPosition;
    const dx = px - tx;
    const dy = py - ty;
    const dz = pz - tz;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (!isInsideRef.current && distance < radius) {
      isInsideRef.current = true;
      onEnter();
    } else if (isInsideRef.current && distance > radius + HYSTERESIS) {
      isInsideRef.current = false;
      onExit();
    }
  });

  return null;
};
