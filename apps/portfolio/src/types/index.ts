export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: number;
}

export interface ProjectMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly period: string;
  readonly techStack: readonly string[];
  readonly role: string;
  readonly highlights: readonly string[];
  readonly metrics?: readonly string[];
}

export interface SkillCategory {
  readonly category: string;
  readonly skills: readonly string[];
}

export interface ProfileData {
  readonly name: string;
  readonly title: string;
  readonly summary: string;
  readonly philosophy: string;
  readonly contact: {
    readonly github: string;
    readonly linkedin: string;
    readonly email: string;
  };
}

export interface MDXFrontmatter {
  readonly title: string;
  readonly description: string;
  readonly [key: string]: unknown;
}

// --- 3D Adventure World Types ---

export type WorldId = "hub" | "projects" | "lab";

export type QualityTier = "high" | "medium" | "low";

export type CameraMode = "first-person" | "third-person" | "tour";

export type Vec3 = readonly [number, number, number];

export interface WorldConfig {
  readonly id: WorldId;
  readonly name: string;
  readonly description: string;
  readonly spawnPosition: Vec3;
  readonly theme: string;
  readonly portalPositions: ReadonlyMap<WorldId, Vec3>;
}

export interface CollectibleMeta {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly worldId: WorldId;
  readonly position: Vec3;
  readonly linkedSkill: string;
}

export interface ProjectPlacement {
  readonly slug: string;
  readonly position: Vec3;
  readonly rotation: number;
  readonly worldId: WorldId;
}

export interface TourStop {
  readonly slug: string;
  readonly position: Vec3;
  readonly lookAt: Vec3;
  readonly title: string;
}
