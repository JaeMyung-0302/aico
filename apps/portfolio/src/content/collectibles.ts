import type { CollectibleMeta, WorldId } from "@/types";

export const collectibles: readonly CollectibleMeta[] = [
  // Hub (기술의 섬) - 4개
  {
    id: "react-orb",
    name: "React 오브",
    description: "컴포넌트 기반 UI의 핵심을 담은 빛나는 구체",
    worldId: "hub",
    position: [5, 1.5, 5],
    linkedSkill: "React 19",
  },
  {
    id: "typescript-crystal",
    name: "TypeScript 크리스탈",
    description: "타입 안전성의 결정체. 런타임 에러를 사전 차단합니다",
    worldId: "hub",
    position: [-3, 1.5, 7],
    linkedSkill: "TypeScript",
  },
  {
    id: "nextjs-prism",
    name: "Next.js 프리즘",
    description: "SSR과 RSC를 통합하는 풀스택 프레임워크의 상징",
    worldId: "hub",
    position: [7, 1.5, -3],
    linkedSkill: "Next.js",
  },
  {
    id: "turborepo-gear",
    name: "Turborepo 기어",
    description: "모노레포 빌드 파이프라인을 최적화하는 톱니바퀴",
    worldId: "hub",
    position: [-6, 1.5, -5],
    linkedSkill: "Turborepo",
  },

  // Projects (개발자의 워크샵) - 5개
  {
    id: "nestjs-shield",
    name: "NestJS 방패",
    description: "모듈 기반 백엔드 아키텍처를 수호하는 방패",
    worldId: "projects",
    position: [-8, 1.5, 6],
    linkedSkill: "NestJS",
  },
  {
    id: "prisma-diamond",
    name: "Prisma 다이아몬드",
    description: "타입 안전한 ORM의 빛나는 보석",
    worldId: "projects",
    position: [2, 1.5, 10],
    linkedSkill: "Prisma ORM",
  },
  {
    id: "socketio-spark",
    name: "Socket.io 스파크",
    description: "실시간 양방향 통신의 번개",
    worldId: "projects",
    position: [8, 1.5, 6],
    linkedSkill: "Socket.io",
  },
  {
    id: "zustand-bear",
    name: "Zustand 곰",
    description: "가볍고 강력한 상태 관리의 수호자",
    worldId: "projects",
    position: [0, 1.5, 0],
    linkedSkill: "Zustand",
  },
  {
    id: "tanstack-query-wave",
    name: "TanStack Query 파동",
    description: "서버 상태 캐싱과 동기화의 물결",
    worldId: "projects",
    position: [-4, 1.5, -6],
    linkedSkill: "TanStack Query",
  },

  // Lab (AI 연구소) - 4개
  {
    id: "claude-core",
    name: "Claude 코어",
    description: "Anthropic Claude SDK의 핵심 에너지원",
    worldId: "lab",
    position: [3, 1.5, 5],
    linkedSkill: "Anthropic Claude SDK",
  },
  {
    id: "gemini-star",
    name: "Gemini 별",
    description: "Google Gemini AI의 멀티모달 능력을 담은 별",
    worldId: "lab",
    position: [-5, 1.5, 3],
    linkedSkill: "Google Gemini AI",
  },
  {
    id: "prompt-scroll",
    name: "프롬프트 두루마리",
    description: "AI 프롬프트 엔지니어링의 비법서",
    worldId: "lab",
    position: [6, 1.5, -2],
    linkedSkill: "AI 프롬프트 엔지니어링",
  },
  {
    id: "streaming-vortex",
    name: "스트리밍 소용돌이",
    description: "실시간 토큰 스트리밍 응답의 소용돌이",
    worldId: "lab",
    position: [-3, 1.5, -5],
    linkedSkill: "스트리밍 응답 처리",
  },
];

export const getCollectiblesByWorld = (
  worldId: WorldId,
): readonly CollectibleMeta[] =>
  collectibles.filter((c) => c.worldId === worldId);

export const TOTAL_COLLECTIBLES = collectibles.length;
