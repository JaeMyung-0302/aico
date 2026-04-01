import type { SSEEvent } from '@neurex-viz/shared'
import { PHASE_TO_AGENT } from '@neurex-viz/shared'

interface ObservationLine {
  timestamp: string
  event: 'tool_start' | 'tool_complete'
  tool: string
  session: string
  phase?: string
  agent?: string
  command?: string
  project?: string
  projectPath?: string
}

// Infer command from phase if not explicitly set
const PHASE_TO_COMMAND: Record<string, string> = {
  GOAL: 'develop',
  TDD: 'develop',
  CODE: 'develop',
  VERIFY: 'develop',
  REVIEW: 'develop',
  VERDICT: 'develop',
}

// Infer agent from tool name when no agent/phase info available
const TOOL_TO_AGENT: Record<string, string> = {
  Read: 'planner',
  Glob: 'planner',
  Grep: 'planner',
  Write: 'tdd',
  Edit: 'tdd',
  Bash: 'build-fixer',
  Agent: 'planner',
  WebSearch: 'planner',
  WebFetch: 'planner',
}

export const parseObservationLine = (line: string): SSEEvent | null => {
  try {
    const data = JSON.parse(line) as ObservationLine

    const agent = data.agent
      ?? (data.phase ? (PHASE_TO_AGENT[data.phase] ?? 'unknown') : undefined)
      ?? TOOL_TO_AGENT[data.tool]
      ?? 'unknown'
    const command = data.command ?? (data.phase ? PHASE_TO_COMMAND[data.phase] : undefined)

    return {
      type: data.event,
      agent,
      tool: data.tool,
      phase: data.phase,
      command,
      timestamp: data.timestamp,
      session: data.session,
      project: data.project ?? 'unknown',
    }
  } catch {
    return null
  }
}
