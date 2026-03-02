import type { ProjectMeta } from "@/types";

export const projects: readonly ProjectMeta[] = [
  {
    slug: "cooksnap",
    title: "CookSnap",
    description:
      "AI 기반 레시피 추천 및 식단 관리 플랫폼. 음식 이미지 인식과 Gemini AI를 활용한 맞춤형 레시피 생성.",
    period: "2025.01 - 현재",
    techStack: [
      "React 19",
      "Vite",
      "NestJS",
      "Prisma",
      "PostgreSQL",
      "Gemini AI",
      "Supabase",
      "TanStack Query",
    ],
    role: "풀스택 개발",
    highlights: [
      "Gemini 2.5 Flash를 활용한 AI 레시피 생성 파이프라인 설계",
      "PortOne 결제 SDK 연동 및 결제 플로우 구현",
      "이미지 기반 레시피 검색 기능 개발",
      "Prisma ORM + PostgreSQL 데이터 모델링",
    ],
  },
  {
    slug: "soulblade",
    title: "SoulBlade",
    description:
      "Three.js와 Phaser 3 기반 3D 액션 RPG 게임. 실시간 렌더링과 게임 상태 관리 시스템 구현.",
    period: "2025.02 - 현재",
    techStack: [
      "React 19",
      "Three.js",
      "React Three Fiber",
      "Phaser 3",
      "NestJS",
      "Supabase",
      "Zustand",
    ],
    role: "풀스택 개발 (게임 클라이언트 + 서버)",
    highlights: [
      "React Three Fiber를 이용한 3D 렌더링 파이프라인 구축",
      "Phaser 3 게임 엔진과 React 통합 아키텍처 설계",
      "Zustand 기반 게임 상태 관리 시스템",
      "PWA 지원으로 모바일 게임 플레이 가능",
    ],
  },
  {
    slug: "wasd",
    title: "WASD",
    description:
      "Socket.io 기반 실시간 멀티플레이어 게임 서버. WebSocket 룸 관리와 이벤트 기반 아키텍처 구현.",
    period: "2025.01 - 현재",
    techStack: [
      "React 19",
      "Socket.io",
      "Express.js",
      "Vite",
      "TypeScript",
    ],
    role: "풀스택 개발 (실시간 통신 중심)",
    highlights: [
      "Socket.io 기반 실시간 멀티플레이어 통신 시스템 설계",
      "IP 기반 Rate Limiting으로 서버 보호",
      "룸 관리 및 게임 이벤트 핸들러 구현",
      "커넥션 추적 및 자동 정리 로직",
    ],
  },
  {
    slug: "fridgemate",
    title: "FridgeMate",
    description:
      "스마트 냉장고 관리 앱. 식재료 유통기한 추적, AI 식단 추천, 결제 연동 기능 제공.",
    period: "2025.01 - 현재",
    techStack: [
      "React 19",
      "Vite",
      "Express.js",
      "Prisma",
      "PostgreSQL",
      "Gemini AI",
      "Web Push",
    ],
    role: "풀스택 개발",
    highlights: [
      "유통기한 추적 및 Node Cron 기반 알림 스케줄링",
      "Gemini AI 기반 식단 추천 기능",
      "PortOne 결제 웹훅 처리",
      "Web Push 알림 시스템 구현",
    ],
  },
  {
    slug: "contentbot",
    title: "ContentBot",
    description:
      "Claude AI 기반 자동 콘텐츠 생성 및 퍼블리싱 봇. 트렌드 스캔 → 글 생성 → 멀티 플랫폼 발행 파이프라인.",
    period: "2025.02 - 현재",
    techStack: [
      "Node.js",
      "TypeScript",
      "Anthropic Claude SDK",
      "better-sqlite3",
      "node-cron",
    ],
    role: "단독 개발",
    highlights: [
      "Claude AI 활용 콘텐츠 생성 파이프라인 설계",
      "멀티 플랫폼 자동 퍼블리싱 시스템",
      "일일 예산 추적 및 비용 분석 리포트",
      "SQLite 기반 상태 영속화 및 스케줄링",
    ],
  },
] as const;
