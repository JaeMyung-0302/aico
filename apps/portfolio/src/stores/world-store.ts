import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CameraMode, QualityTier, Vec3, WorldId } from "@/types";

interface WorldState {
  // Player
  readonly playerPosition: Vec3;
  readonly playerRotation: number;
  readonly cameraMode: CameraMode;

  // World
  readonly currentWorld: WorldId;
  readonly isTransitioning: boolean;

  // Collectibles (persisted)
  readonly collectedItems: ReadonlySet<string>;

  // Context
  readonly nearbyProject: string | null;

  // Mobile input
  readonly mobileInput: { readonly moveX: number; readonly moveY: number } | null;

  // Quality
  readonly qualityTier: QualityTier;
  readonly suggestFallback: boolean;
}

interface WorldActions {
  readonly setPlayerPosition: (position: Vec3) => void;
  readonly setPlayerRotation: (rotation: number) => void;
  readonly setCameraMode: (mode: CameraMode) => void;
  readonly setCurrentWorld: (worldId: WorldId) => void;
  readonly setIsTransitioning: (transitioning: boolean) => void;
  readonly collectItem: (itemId: string) => void;
  readonly setNearbyProject: (slug: string | null) => void;
  readonly setMobileInput: (input: { readonly moveX: number; readonly moveY: number } | null) => void;
  readonly setQualityTier: (tier: QualityTier) => void;
  readonly setSuggestFallback: (suggest: boolean) => void;
}

type WorldStore = WorldState & WorldActions;

const INITIAL_STATE: WorldState = {
  playerPosition: [0, 1, 0],
  playerRotation: 0,
  cameraMode: "first-person",
  currentWorld: "hub",
  isTransitioning: false,
  collectedItems: new Set<string>(),
  nearbyProject: null,
  mobileInput: null,
  qualityTier: "high",
  suggestFallback: false,
};

export const useWorldStore = create<WorldStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setPlayerPosition: (position) => set({ playerPosition: position }),
      setPlayerRotation: (rotation) => set({ playerRotation: rotation }),
      setCameraMode: (mode) => set({ cameraMode: mode }),

      setCurrentWorld: (worldId) => set({ currentWorld: worldId }),
      setIsTransitioning: (transitioning) =>
        set({ isTransitioning: transitioning }),

      collectItem: (itemId) =>
        set((state) => {
          if (state.collectedItems.has(itemId)) return state;
          return {
            collectedItems: new Set([...state.collectedItems, itemId]),
          };
        }),

      setNearbyProject: (slug) => set({ nearbyProject: slug }),
      setMobileInput: (input) => set({ mobileInput: input }),
      setQualityTier: (tier) => set({ qualityTier: tier }),
      setSuggestFallback: (suggest) => set({ suggestFallback: suggest }),
    }),
    {
      name: "portfolio-world-store",
      partialize: (state) => ({
        collectedItems: [...state.collectedItems],
      }),
      merge: (persisted, current) => {
        const stored =
          typeof persisted === "object" && persisted !== null
            ? (persisted as Record<string, unknown>)
            : {};
        const items = Array.isArray(stored["collectedItems"])
          ? (stored["collectedItems"] as string[])
          : [];
        return {
          ...current,
          collectedItems: new Set(items),
        };
      },
    },
  ),
);
