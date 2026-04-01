import {
  BufferGeometry,
  LineBasicMaterial,
  Line,
  Vector3,
  Group,
  QuadraticBezierCurve3,
} from 'three'
import type { AgentMeta } from '@neurex-viz/shared'

// Define agent flow connections based on /develop command flow
const CONNECTIONS: [string, string][] = [
  // Discovery → Planning
  ['business-plan', 'planner'],
  ['business-plan', 'architect'],
  ['pm-strategist', 'planner'],
  // Planning → Development
  ['planner', 'tdd'],
  ['architect', 'tdd'],
  // Development internal
  ['tdd', 'build-fixer'],
  ['tdd', 'designer'],
  ['debugger', 'tdd'],
  ['autoresearch', 'tdd'],
  // Development → Review
  ['build-fixer', 'reviewer'],
  ['tdd', 'reviewer'],
  ['reviewer', 'security'],
  ['reviewer', 'database'],
  // Review → Maintenance
  ['reviewer', 'e2e'],
  ['reviewer', 'refactor'],
  ['reviewer', 'docs'],
]

export const createConnections = (
  agents: AgentMeta[],
  positions: Map<string, Vector3>,
): { group: Group; connectionMap: Map<string, Line> } => {
  const group = new Group()
  const connectionMap = new Map<string, Line>()
  const agentIds = new Set(agents.map((a) => a.id))

  for (const [from, to] of CONNECTIONS) {
    if (!agentIds.has(from) || !agentIds.has(to)) continue

    const start = positions.get(from)
    const end = positions.get(to)
    if (!start || !end) continue

    // Curved connection
    const mid = new Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
      .add(new Vector3(0, 0.5, 0.5))

    const curve = new QuadraticBezierCurve3(start, mid, end)
    const points = curve.getPoints(20)

    const geometry = new BufferGeometry().setFromPoints(points)
    const material = new LineBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.2,
    })

    const line = new Line(geometry, material)
    line.userData = { from, to }
    group.add(line)

    const key = `${from}->${to}`
    connectionMap.set(key, line)
  }

  return { group, connectionMap }
}
