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
    metrics: [
      "Gemini API 응답 < 1.5초",
      "PortOne 결제 플로우 3단계 구현",
      "이미지 인식 기반 레시피 매칭",
    ],
  },
  {
    slug: "geumsugangsan",
    title: "금수강산",
    description:
      "한국 전통 문화를 배경으로 한 2D 픽셀아트 농장 시뮬레이션 RPG. Phaser 3 + TypeScript 기반.",
    period: "2026.03 - 현재",
    techStack: [
      "React 19",
      "Phaser 3",
      "TypeScript",
      "Vite",
      "NestJS",
      "Prisma",
      "Zustand",
    ],
    role: "풀스택 개발 (게임 클라이언트 + 서버)",
    highlights: [
      "Phaser 3 Scene + SystemManager 패턴으로 12개 게임 시스템 모듈화",
      "JSON 데이터 드리븐 설계로 콘텐츠 확장성 확보",
      "한국어/영어 i18n 경량 런타임 구현",
      "모바일 터치 입력 추상화 레이어",
    ],
    metrics: [
      "12개 게임 시스템 모듈화",
      "JSON 데이터 드리븐 설계",
      "한/영 i18n 경량 런타임",
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
    metrics: [
      "WebSocket 실시간 동시접속 관리",
      "IP Rate Limiting 방어",
      "자동 커넥션 정리 시스템",
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
    metrics: [
      "Node Cron 스케줄링 알림",
      "Web Push 알림 시스템",
      "PortOne 웹훅 결제 처리",
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
    metrics: [
      "Claude AI 콘텐츠 파이프라인",
      "멀티 플랫폼 자동 퍼블리싱",
      "일일 예산 추적 리포트",
    ],
  },
  {
    slug: "portfolio",
    title: "3D Portfolio",
    description:
      "Next.js 15 + React Three Fiber + Rapier 물리 엔진 기반 3D 인터랙티브 포트폴리오. Claude AI 챗봇과 수집 시스템 내장.",
    period: "2026.03 - 현재",
    techStack: [
      "Next.js 15",
      "React Three Fiber",
      "Rapier Physics",
      "Zustand",
      "Claude AI",
      "TypeScript",
      "SCSS",
    ],
    role: "풀스택 개발",
    highlights: [
      "R3F + Rapier 기반 3D 물리 세계 구현",
      "멀티 월드 포탈 전환 시스템",
      "적응형 품질 조절 (Adaptive Quality)",
      "Claude AI 실시간 스트리밍 챗봇",
    ],
    metrics: [
      "3개 월드 + 13개 수집품",
      "적응형 3단계 품질 관리",
      "가이드 투어 시스템",
    ],
  },
] as const;
