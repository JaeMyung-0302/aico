import {
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  Vector3,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three'
import type { AgentMeta } from '@neurex-viz/shared'

const createLabelTexture = (text: string, color: string): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 24px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.fillText(text, 128, 40)
  return new CanvasTexture(canvas)
}

export const createNodes = (
  agents: AgentMeta[],
  positions: Map<string, Vector3>,
): Map<string, Mesh> => {
  const nodes = new Map<string, Mesh>()

  for (const agent of agents) {
    const pos = positions.get(agent.id)
    if (!pos) continue

    const geometry = new SphereGeometry(0.5, 32, 32)
    const material = new MeshStandardMaterial({
      color: agent.color,
      emissive: agent.color,
      emissiveIntensity: 0.15,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.9,
    })

    const mesh = new Mesh(geometry, material)
    mesh.position.copy(pos)
    mesh.userData = { agentId: agent.id, phase: agent.phase }

    // Label
    const labelTexture = createLabelTexture(agent.id, agent.color)
    const labelMaterial = new SpriteMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0.8,
    })
    const label = new Sprite(labelMaterial)
    label.position.set(0, 0.9, 0)
    label.scale.set(2.5, 0.6, 1)
    mesh.add(label)

    nodes.set(agent.id, mesh)
  }

  return nodes
}
