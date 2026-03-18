import type { TourStop } from "@/types";

export const tourStops: readonly TourStop[] = [
  {
    slug: "cooksnap",
    title: "CookSnap",
    position: [-6, 3, -1],
    lookAt: [-6, 1.5, 4],
  },
  {
    slug: "geumsugangsan",
    title: "금수강산",
    position: [0, 3, 3],
    lookAt: [0, 1.5, 8],
  },
  {
    slug: "wasd",
    title: "WASD",
    position: [6, 3, -1],
    lookAt: [6, 1.5, 4],
  },
  {
    slug: "fridgemate",
    title: "FridgeMate",
    position: [-4, 3, -9],
    lookAt: [-4, 1.5, -4],
  },
  {
    slug: "portfolio",
    title: "3D Portfolio",
    position: [0, 3, -9],
    lookAt: [0, 1.5, -4],
  },
  {
    slug: "contentbot",
    title: "ContentBot",
    position: [-8, 3, 1],
    lookAt: [-10, 1.5, 0],
  },
];

export const TOUR_STOP_COUNT = tourStops.length;
