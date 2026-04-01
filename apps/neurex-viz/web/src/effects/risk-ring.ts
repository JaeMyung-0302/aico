import {
  RingGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide,
} from 'three'
import type { RiskLevel } from '@neurex-viz/shared'
import { RISK_COLORS } from '@neurex-viz/shared'

export const createRiskRingManager = (nodes: Map<string, Mesh>) => {
  const rings = new Map<string, Mesh>()
  const riskLevels = new Map<string, RiskLevel>()
  const eventCounts = new Map<string, { count: number; timestamps: number[] }>()

  // Create rings for all nodes
  for (const [agentId, node] of nodes) {
    const geometry = new RingGeometry(0.6, 0.72, 32)
    const material = new MeshBasicMaterial({
      color: 0x2ecc71,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
    })
    const ring = new Mesh(geometry, material)
    ring.lookAt(0, 0, 1) // Face camera generally
    node.add(ring)
    rings.set(agentId, ring)
  }

  const recordEvent = (agentId: string) => {
    const now = Date.now()
    const entry = eventCounts.get(agentId) ?? { count: 0, timestamps: [] }
    entry.timestamps.push(now)
    // Keep only last 60 seconds
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60000)
    entry.count = entry.timestamps.length
    eventCounts.set(agentId, entry)

    // Calculate risk from recent 30s burst activity (not 60s total)
    const recentCount = entry.timestamps.filter((t) => now - t < 30000).length
    let level: RiskLevel = 'SAFE'
    if (recentCount >= 5) level = 'HOT'
    else if (recentCount >= 2) level = 'WARM'
    riskLevels.set(agentId, level)
  }

  const setRisk = (agentId: string, level: RiskLevel) => {
    riskLevels.set(agentId, level)
  }

  const update = (time: number) => {
    for (const [agentId, ring] of rings) {
      const level = riskLevels.get(agentId) ?? 'SAFE'
      const material = ring.material as MeshBasicMaterial

      material.color.set(RISK_COLORS[level])

      if (level === 'SAFE') {
        material.opacity = 0
      } else if (level === 'WARM') {
        material.opacity = 0.4 + Math.sin(time * 3) * 0.2
      } else {
        material.opacity = 0.6 + Math.sin(time * 5) * 0.2
      }
    }
  }

  return { recordEvent, setRisk, update }
}
