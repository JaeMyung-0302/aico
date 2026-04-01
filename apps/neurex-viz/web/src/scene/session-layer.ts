import {
  Group,
  Vector3,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  MeshStandardMaterial,
} from 'three'
import type { AgentMeta } from '@neurex-viz/shared'
import { createNodes } from './create-nodes.ts'
import { createConnections } from './create-connections.ts'
import { calculateNodePositions } from './layout.ts'
import { createGlowManager } from '../effects/glow.ts'
import { createParticleSystem } from '../effects/particles.ts'
import { createRiskRingManager } from '../effects/risk-ring.ts'
import type { Line, Mesh } from 'three'

// Per-session accent colors (for labels and subtle tinting)
const SESSION_ACCENT_COLORS = [
  '#ffffff',
  '#58d1eb',
  '#f0a030',
  '#e06090',
  '#80e080',
]

const CLUSTER_SPACING = 22 // X-axis spacing between session clusters
const NODE_SCALE = 0.55    // Scale down nodes so clusters don't overlap

export interface SessionLayer {
  sessionId: string
  project: string
  group: Group
  nodes: Map<string, Mesh>
  connectionMap: Map<string, Line>
  positions: Map<string, Vector3>
  glowManager: ReturnType<typeof createGlowManager>
  particleSystem: ReturnType<typeof createParticleSystem>
  riskRingManager: ReturnType<typeof createRiskRingManager>
  lastActiveAgent: string | null
  lastSeen: number
}

const createSessionLabel = (project: string, color: string): Sprite => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.fillText(project, 256, 44)

  const texture = new CanvasTexture(canvas)
  const material = new SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 })
  const sprite = new Sprite(material)
  sprite.scale.set(6, 0.8, 1)
  return sprite
}

export const createSessionLayerManager = (agents: AgentMeta[]) => {
  const layers = new Map<string, SessionLayer>()
  let layerCount = 0

  const createLayer = (sessionId: string, project: string): SessionLayer => {
    const index = layerCount++
    const group = new Group()

    // Place clusters side by side along X axis, centered
    // index 0 at center, others spread left/right
    const xOffset = index === 0 ? 0 : (Math.ceil(index / 2) * CLUSTER_SPACING * (index % 2 === 1 ? -1 : 1))
    group.position.set(xOffset, 0, 0)
    group.scale.setScalar(NODE_SCALE)

    const positions = calculateNodePositions(agents)
    const nodes = createNodes(agents, positions)
    const { group: connectionGroup, connectionMap } = createConnections(agents, positions)

    // Add nodes and connections to group
    for (const node of nodes.values()) {
      group.add(node)
    }
    group.add(connectionGroup)

    // Session label above the cluster
    const accentColor = SESSION_ACCENT_COLORS[index % SESSION_ACCENT_COLORS.length] ?? '#ffffff'
    const label = createSessionLabel(project, accentColor)
    label.position.set(0, 10, 0)
    group.add(label)

    // Effects
    const glowManager = createGlowManager(nodes)
    const particleSystem = createParticleSystem(positions)
    group.add(particleSystem.group)
    const riskRingManager = createRiskRingManager(nodes)

    const layer: SessionLayer = {
      sessionId,
      project,
      group,
      nodes,
      connectionMap,
      positions,
      glowManager,
      particleSystem,
      riskRingManager,
      lastActiveAgent: null,
      lastSeen: Date.now(),
    }

    layers.set(sessionId, layer)
    return layer
  }

  const getOrCreateLayer = (sessionId: string, project: string): SessionLayer => {
    const existing = layers.get(sessionId)
    if (existing) {
      existing.lastSeen = Date.now()
      return existing
    }
    return createLayer(sessionId, project)
  }

  const updateAll = (time: number) => {
    const now = Date.now()
    for (const layer of layers.values()) {
      layer.glowManager.update(time)
      layer.particleSystem.update(time)
      layer.riskRingManager.update(time)

      // Dim inactive sessions (no events for 30s) — only touch agent nodes
      const isStale = now - layer.lastSeen > 30_000
      const targetScale = isStale ? 0.4 : NODE_SCALE
      const currentScale = layer.group.scale.x
      layer.group.scale.setScalar(currentScale + (targetScale - currentScale) * 0.02)

      // Slow rotation for idle
      for (const node of layer.nodes.values()) {
        node.rotation.y = Math.sin(time * 0.2 + node.position.x) * 0.05
      }
    }
  }

  const getAllLayers = (): SessionLayer[] => [...layers.values()]

  return { getOrCreateLayer, updateAll, getAllLayers }
}
