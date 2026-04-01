import {
  BufferGeometry,
  LineDashedMaterial,
  Line,
  Vector3,
  Group,
  QuadraticBezierCurve3,
} from 'three'
import type { SkillMeta } from '@neurex-viz/shared'

export const createSkillConnections = (
  skills: SkillMeta[],
  skillPositions: Map<string, Vector3>,
  agentPositions: Map<string, Vector3>,
): { group: Group; connectionMap: Map<string, Line> } => {
  const group = new Group()
  const connectionMap = new Map<string, Line>()

  for (const skill of skills) {
    const skillPos = skillPositions.get(skill.id)
    if (!skillPos) continue

    for (const agentId of skill.agents) {
      const agentPos = agentPositions.get(agentId)
      if (!agentPos) continue

      // Curved dashed line from skill to agent
      const mid = new Vector3()
        .addVectors(skillPos, agentPos)
        .multiplyScalar(0.5)
        .add(new Vector3(0, 0.8, 0.3))

      const curve = new QuadraticBezierCurve3(skillPos, mid, agentPos)
      const points = curve.getPoints(20)

      const geometry = new BufferGeometry().setFromPoints(points)
      const material = new LineDashedMaterial({
        color: skill.color,
        transparent: true,
        opacity: 0.04,
        dashSize: 0.2,
        gapSize: 0.3,
      })

      const line = new Line(geometry, material)
      line.computeLineDistances()
      line.userData = { from: skill.id, to: agentId, isSkillConnection: true }
      group.add(line)

      const key = `skill:${skill.id}->${agentId}`
      connectionMap.set(key, line)
    }
  }

  return { group, connectionMap }
}
