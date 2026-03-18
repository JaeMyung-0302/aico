"use client";

import { useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";

import { useWorldStore } from "@/stores/world-store";

const FPS_WINDOW = 60;
const DEBOUNCE_SECONDS = 3;
const HIGH_FPS = 50;
const LOW_FPS = 25;
const CRITICAL_FPS = 15;
const CRITICAL_DURATION = 5;

export const AdaptiveQuality = () => {
  const { gl } = useThree();
  const setQualityTier = useWorldStore((s) => s.setQualityTier);

  const ring = useRef(new Float32Array(FPS_WINDOW));
  const ringIndex = useRef(0);
  const ringSum = useRef(0);
  const sampleCount = useRef(0);
  const lastTierChange = useRef(0);
  const criticalStart = useRef<number | null>(null);
  const suggestedFallback = useRef(false);

  useFrame((_, delta) => {
    const fps = delta > 0 ? 1 / delta : 60;
    const buf = ring.current;
    const idx = ringIndex.current;

    ringSum.current -= buf[idx]!;
    buf[idx] = fps;
    ringSum.current += fps;
    ringIndex.current = (idx + 1) % FPS_WINDOW;
    if (sampleCount.current < FPS_WINDOW) {
      sampleCount.current++;
      return;
    }

    const now = performance.now() / 1000;
    if (now - lastTierChange.current < DEBOUNCE_SECONDS) return;

    const avg = ringSum.current / FPS_WINDOW;

    if (avg >= HIGH_FPS) {
      gl.shadowMap.enabled = true;
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      setQualityTier("high");
      criticalStart.current = null;
    } else if (avg >= LOW_FPS) {
      gl.shadowMap.enabled = false;
      gl.setPixelRatio(1);
      setQualityTier("medium");
      criticalStart.current = null;
    } else {
      gl.shadowMap.enabled = false;
      gl.setPixelRatio(0.75);
      setQualityTier("low");

      // Track critically low FPS
      if (avg < CRITICAL_FPS) {
        if (criticalStart.current === null) {
          criticalStart.current = now;
        } else if (
          now - criticalStart.current > CRITICAL_DURATION &&
          !suggestedFallback.current
        ) {
          suggestedFallback.current = true;
          useWorldStore.getState().setSuggestFallback(true);
        }
      } else {
        criticalStart.current = null;
      }
    }

    lastTierChange.current = now;
  });

  return null;
};
