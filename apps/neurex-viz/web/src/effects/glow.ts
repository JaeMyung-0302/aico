import { Color } from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'

interface ActiveGlow {
  startTime: number
  intensity: number
  color: Color
}

export const createGlowManager = (nodes: Map<string, Mesh>) => {
  const activeGlows = new Map<string, ActiveGlow>()
  const originalColors = new Map<string, Color>()
  const GLOW_DURATION = 2.5 // seconds
  const MAX_INTENSITY = 1.8
  const BASE_INTENSITY = 0.15

  // Store original emissive colors
  for (const [id, node] of nodes) {
    const mat = node.material as MeshStandardMaterial
    originalColors.set(id, mat.emissive.clone())
  }

  const activate = (agentId: string, glowColor?: string) => {
    activeGlows.set(agentId, {
      startTime: performance.now() / 1000,
      intensity: MAX_INTENSITY,
      color: glowColor ? new Color(glowColor) : (originalColors.get(agentId) ?? new Color('#ffffff')),
    })

    // Set emissive to session color during glow
    const node = nodes.get(agentId)
    if (node && glowColor) {
      const material = node.material as MeshStandardMaterial
      material.emissive.set(glowColor)
    }
  }

  const update = (time: number) => {
    for (const [agentId, glow] of activeGlows) {
      const elapsed = time - glow.startTime
      const progress = Math.min(elapsed / GLOW_DURATION, 1)

      const eased = 1 - Math.pow(1 - progress, 3)
      const intensity = MAX_INTENSITY - eased * (MAX_INTENSITY - BASE_INTENSITY)

      const node = nodes.get(agentId)
      if (node) {
        const material = node.material as MeshStandardMaterial
        material.emissiveIntensity = intensity

        // Lerp emissive color back to original
        const original = originalColors.get(agentId)
        if (original) {
          material.emissive.lerp(original, progress)
        }

        const scale = 1 + (1 - progress) * 0.15
        node.scale.setScalar(scale)
      }

      if (progress >= 1) {
        activeGlows.delete(agentId)
        const node = nodes.get(agentId)
        if (node) {
          node.scale.setScalar(1)
          const original = originalColors.get(agentId)
          if (original) {
            ;(node.material as MeshStandardMaterial).emissive.copy(original)
          }
        }
      }
    }
  }

  return { activate, update }
}
