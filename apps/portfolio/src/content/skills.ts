import type { SkillCategory } from "@/types";

export const skills: readonly SkillCategory[] = [
  {
    category: "Frontend",
    skills: [
      "React 19",
      "Next.js",
      "TypeScript",
      "Vite",
      "Three.js",
      "React Three Fiber",
      "Zustand",
      "TanStack Query",
      "SCSS Modules",
    ],
  },
  {
    category: "Backend",
    skills: [
      "NestJS",
      "Express.js",
      "Prisma ORM",
      "PostgreSQL",
      "Socket.io",
      "REST API",
      "JWT Auth",
    ],
  },
  {
    category: "AI / ML",
    skills: [
      "Anthropic Claude SDK",
      "Google Gemini AI",
      "AI 프롬프트 엔지니어링",
      "스트리밍 응답 처리",
    ],
  },
  {
    category: "Infra / DevOps",
    skills: [
      "Turborepo",
      "pnpm",
      "Vercel",
      "Supabase",
      "Docker",
      "Git",
      "ESLint",
    ],
  },
] as const;
