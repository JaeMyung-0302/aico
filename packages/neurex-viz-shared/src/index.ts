export interface AgentMeta {
  id: string
  name: string
  phase: 1 | 2 | 3 | 4 | 5
  category: string
  file: string
  color: string
}

export interface SkillMeta {
  id: string
  name: string
  agents: string[] // agent IDs this skill orchestrates
  color: string
}

export interface SSEEvent {
  type: 'tool_start' | 'tool_complete' | 'phase_change' | 'session_discovered'
  agent: string
  tool?: string
  phase?: string
  command?: string // active skill/command (e.g., 'develop', 'kickoff')
  riskTemperature?: RiskLevel
  timestamp: string
  session?: string
  project?: string
}

export interface SessionInfo {
  sessionId: string
  project: string
  lastSeen: number
  eventCount: number
}

export type RiskLevel = 'SAFE' | 'WARM' | 'HOT'

export const PHASE_COLORS: Record<number, string> = {
  1: '#4A90D9', // Discovery - blue
  2: '#9B59B6', // Planning - purple
  3: '#2ECC71', // Development - green
  4: '#E67E22', // Review - orange
  5: '#3498DB', // Maintenance - sky blue
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Discovery',
  2: 'Planning',
  3: 'Development',
  4: 'Review',
  5: 'Maintenance',
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: '#2ecc71',
  WARM: '#f1c40f',
  HOT: '#e74c3c',
}

export const SKILL_DEFINITIONS: SkillMeta[] = [
  { id: 'develop', name: '/develop', agents: ['debugger', 'tdd', 'build-fixer', 'designer', 'reviewer', 'security', 'database'], color: '#FFD700' },
  { id: 'kickoff', name: '/kickoff', agents: ['business-plan', 'pm-strategist', 'architect', 'planner'], color: '#FF8C00' },
  { id: 'maintain', name: '/maintain', agents: ['docs', 'e2e', 'refactor'], color: '#00CED1' },
  { id: 'autoresearch', name: '/autoresearch', agents: ['autoresearch', 'tdd'], color: '#DA70D6' },
  { id: 'pr', name: '/pr', agents: ['reviewer', 'security', 'database', 'architect'], color: '#87CEEB' },
  { id: 'pm', name: '/pm', agents: ['pm-strategist'], color: '#F08080' },
]

export const PHASE_TO_AGENT: Record<string, string> = {
  GOAL: 'planner',
  TDD: 'tdd',
  CODE: 'tdd',
  VERIFY: 'build-fixer',
  REVIEW: 'reviewer',
  VERDICT: 'reviewer',
}
