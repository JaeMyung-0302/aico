import { Vector3 } from 'three'
import type { AgentMeta, SkillMeta } from '@neurex-viz/shared'

// Skill hub positions — between the phase clusters they connect
export const calculateSkillPositions = (skills: SkillMeta[]): Map<string, Vector3> => {
  const positions = new Map<string, Vector3>()

  const skillPositions: Record<string, { x: number; y: number }> = {
    develop:      { x: -3, y: -3.5 },  // between Development and Review
    kickoff:      { x: 0, y: 5 },      // between Discovery and Planning
    maintain:     { x: 4, y: -3.5 },   // near Maintenance
    autoresearch: { x: 4, y: 2 },      // near Development right
    pr:           { x: -4, y: 2 },     // near Review
    pm:           { x: -10, y: 5 },    // near Discovery left
  }

  for (const skill of skills) {
    const pos = skillPositions[skill.id]
    if (pos) {
      positions.set(skill.id, new Vector3(pos.x, pos.y, 0))
    }
  }

  return positions
}

export const calculateNodePositions = (agents: AgentMeta[]): Map<string, Vector3> => {
  const positions = new Map<string, Vector3>()

  // Group agents by phase
  const phaseGroups = new Map<number, AgentMeta[]>()
  for (const agent of agents) {
    const group = phaseGroups.get(agent.phase) ?? []
    group.push(agent)
    phaseGroups.set(agent.phase, group)
  }

  // Phase cluster centers — spread wide to avoid overlap
  const phaseCenters: Record<number, { x: number; y: number }> = {
    1: { x: -6, y: 7 },    // Discovery - top-left
    2: { x: 6, y: 7 },     // Planning - top-right
    3: { x: 0, y: 0 },     // Development - center
    4: { x: -7, y: -7 },   // Review - bottom-left
    5: { x: 7, y: -7 },    // Maintenance - bottom-right
  }

  for (const [phase, group] of phaseGroups) {
    const center = phaseCenters[phase]
    if (!center) continue

    const count = group.length

    // Arrange nodes in a circle around the phase center
    const radius = count <= 2 ? 1.5 : 2.2

    for (let i = 0; i < count; i++) {
      const agent = group[i]
      if (!agent) continue

      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      const z = 0

      positions.set(agent.id, new Vector3(x, y, z))
    }
  }

  return positions
}
