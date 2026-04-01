import fs from 'node:fs'
import path from 'node:path'
import type { AgentMeta } from '@neurex-viz/shared'
import { PHASE_COLORS } from '@neurex-viz/shared'

const FILENAME_REGEX = /^(\d)-([a-z]+)-([a-z0-9-]+)\.md$/

export const scanAgents = (agentsDir: string): AgentMeta[] => {
  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Agents directory not found: ${agentsDir}`)
  }

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'))
  const agents: AgentMeta[] = []

  for (const file of files) {
    const match = file.match(FILENAME_REGEX)
    if (!match) continue

    const phaseStr = match[1]
    const category = match[2]
    const name = match[3]
    if (!phaseStr || !category || !name) continue

    const phase = parseInt(phaseStr, 10) as 1 | 2 | 3 | 4 | 5

    agents.push({
      id: name,
      name: name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      phase,
      category,
      file,
      color: PHASE_COLORS[phase] ?? '#888888',
    })
  }

  return agents.sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id))
}
