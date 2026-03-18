import type { ProjectPlacement, Vec3, WorldConfig, WorldId } from "@/types";

export const worldConfigs: ReadonlyMap<WorldId, WorldConfig> = new Map([
  [
    "hub",
    {
      id: "hub",
      name: "기술의 섬",
      description:
        "포트폴리오의 중심. 여기서 다른 세계로 이동할 수 있습니다.",
      spawnPosition: [0, 1, 0] as Vec3,
      theme: "floating-island",
      portalPositions: new Map<WorldId, Vec3>([
        ["projects", [10, 0, 0]],
        ["lab", [-10, 0, 0]],
      ]),
    },
  ],
  [
    "projects",
    {
      id: "projects",
      name: "개발자의 워크샵",
      description:
        "실제 프로젝트들이 건물로 구현된 세계. 가까이 다가가면 상세 정보를 볼 수 있습니다.",
      spawnPosition: [0, 1, 0] as Vec3,
      theme: "workshop",
      portalPositions: new Map<WorldId, Vec3>([["hub", [0, 0, -15]]]),
    },
  ],
  [
    "lab",
    {
      id: "lab",
      name: "AI 연구소",
      description:
        "AI/ML 기술을 탐험하는 사이버펑크 공간. ContentBot의 기술을 체험하세요.",
      spawnPosition: [0, 1, 0] as Vec3,
      theme: "cyberpunk",
      portalPositions: new Map<WorldId, Vec3>([["hub", [0, 0, -15]]]),
    },
  ],
]);

const projectPlacements: readonly ProjectPlacement[] = [
  {
    slug: "cooksnap",
    position: [-6, 0, 4],
    rotation: 0.3,
    worldId: "projects",
  },
  {
    slug: "geumsugangsan",
    position: [0, 0, 8],
    rotation: 0,
    worldId: "projects",
  },
  {
    slug: "wasd",
    position: [6, 0, 4],
    rotation: -0.3,
    worldId: "projects",
  },
  {
    slug: "fridgemate",
    position: [-4, 0, -4],
    rotation: 0.5,
    worldId: "projects",
  },
  {
    slug: "contentbot",
    position: [4, 0, -4],
    rotation: -0.5,
    worldId: "lab",
  },
  {
    slug: "portfolio",
    position: [0, 0, -4],
    rotation: 0,
    worldId: "projects",
  },
];

export const getProjectPlacements = (
  worldId?: WorldId,
): readonly ProjectPlacement[] =>
  worldId
    ? projectPlacements.filter((p) => p.worldId === worldId)
    : projectPlacements;
