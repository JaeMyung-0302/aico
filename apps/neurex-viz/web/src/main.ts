import { Clock, Sprite, SpriteMaterial, CanvasTexture } from 'three'
import type { AgentMeta, SkillMeta, SSEEvent } from '@neurex-viz/shared'
import { createScene } from './scene/create-scene.ts'
import { createNodes } from './scene/create-nodes.ts'
import { createConnections } from './scene/create-connections.ts'
import { createSkillNodes } from './scene/create-skill-nodes.ts'
import { createSkillConnections } from './scene/create-skill-connections.ts'
import { calculateNodePositions, calculateSkillPositions } from './scene/layout.ts'
import { createGlowManager } from './effects/glow.ts'
import { createParticleSystem } from './effects/particles.ts'
import { createRiskRingManager } from './effects/risk-ring.ts'
import { connectSSE } from './sse/event-source.ts'

const SESSION_COLORS = [
  '#ffffff', '#58d1eb', '#f0a030', '#e06090', '#80e080', '#c080ff',
]

const init = async () => {
  const container = document.getElementById('app')
  if (!container) return

  // Fetch data
  let agents: AgentMeta[]
  let skills: SkillMeta[]
  try {
    const [agentsRes, skillsRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/skills'),
    ])
    if (!agentsRes.ok || !skillsRes.ok) {
      throw new Error(`Server error: agents=${agentsRes.status} skills=${skillsRes.status}`)
    }
    agents = await agentsRes.json()
    skills = await skillsRes.json()
  } catch (err) {
    const status = document.getElementById('status')
    if (status) {
      status.textContent = `neurex-viz: ${err instanceof Error ? err.message : 'server not connected'}`
    }
    return
  }

  // Create scene
  const { scene, controls, composer } = createScene(container)

  // Agent nodes
  const agentPositions = calculateNodePositions(agents)
  const agentNodes = createNodes(agents, agentPositions)
  const { group: agentConnectionGroup, connectionMap } = createConnections(agents, agentPositions)

  for (const node of agentNodes.values()) scene.add(node)
  scene.add(agentConnectionGroup)

  // Skill nodes
  const skillPositions = calculateSkillPositions(skills)
  const skillNodes = createSkillNodes(skills, skillPositions)
  const { group: skillConnectionGroup, connectionMap: skillConnectionMap } =
    createSkillConnections(skills, skillPositions, agentPositions)

  for (const node of skillNodes.values()) scene.add(node)
  scene.add(skillConnectionGroup)

  // Merge all nodes for glow/effects (skills + agents)
  const allNodes = new Map([...agentNodes, ...skillNodes])
  const allPositions = new Map([...agentPositions, ...skillPositions])

  // Effects
  const glowManager = createGlowManager(allNodes)
  const particleSystem = createParticleSystem(allPositions)
  scene.add(particleSystem.group)
  const riskRingManager = createRiskRingManager(agentNodes)

  // Call count tracking
  const callCounts = new Map<string, number>()
  const countLabels = new Map<string, Sprite>()
  const auraSprites = new Map<string, Sprite>()

  const MAX_AURA_SCALE = 3.5
  const AURA_SCALE_FACTOR = 0.08
  const BASE_AURA_SCALE = 1.5

  const createAuraTexture = (color: string): CanvasTexture => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, color + '30')
    gradient.addColorStop(0.5, color + '15')
    gradient.addColorStop(1, color + '00')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    return new CanvasTexture(canvas)
  }

  const createCountLabel = (): Sprite => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const texture = new CanvasTexture(canvas)
    const material = new SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 })
    const sprite = new Sprite(material)
    sprite.scale.set(2.0, 0.5, 1)
    return sprite
  }

  const updateCountLabel = (sprite: Sprite, count: number, color: string) => {
    const texture = sprite.material.map as CanvasTexture
    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = color
    ctx.globalAlpha = 0.7
    ctx.fillText(`×${count}`, 128, 44)
    texture.needsUpdate = true
  }

  const incrementCallCount = (id: string, isSkill: boolean) => {
    const count = (callCounts.get(id) ?? 0) + 1
    callCounts.set(id, count)

    const nodes = isSkill ? skillNodes : agentNodes
    const node = nodes.get(id)
    if (!node) return

    const meta = isSkill
      ? skills.find((s) => s.id === id)
      : agents.find((a) => a.id === id)
    const color = meta?.color ?? '#888888'

    // Aura — grows with call count
    let aura = auraSprites.get(id)
    if (!aura) {
      const texture = createAuraTexture(color)
      const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
      aura = new Sprite(material)
      aura.position.set(0, 0, -0.1)
      node.add(aura)
      auraSprites.set(id, aura)
    }
    const auraScale = Math.min(BASE_AURA_SCALE + count * AURA_SCALE_FACTOR, MAX_AURA_SCALE)
    aura.scale.setScalar(auraScale)

    // Count label
    let label = countLabels.get(id)
    if (!label) {
      label = createCountLabel()
      label.position.set(0, isSkill ? -1.2 : -0.7, 0)
      node.add(label)
      countLabels.set(id, label)
    }
    updateCountLabel(label, count, color)
  }

  // Session tracking
  const sessionColors = new Map<string, number>()
  let nextColorIndex = 0
  let lastActiveAgent: string | null = null

  const getSessionColor = (sessionId: string): string => {
    let idx = sessionColors.get(sessionId)
    if (idx === undefined) {
      idx = nextColorIndex++
      sessionColors.set(sessionId, idx)
    }
    return SESSION_COLORS[idx % SESSION_COLORS.length] ?? '#ffffff'
  }

  // Build skill lookup: which skill is associated with which command
  const skillById = new Map(skills.map((s) => [s.id, s]))

  // SSE
  const handleSSEEvent = (event: SSEEvent) => {
    const phaseDisplay = document.getElementById('phase-display')

    if (event.type === 'phase_change') {
      if (phaseDisplay && event.phase) {
        phaseDisplay.textContent = `Phase: ${event.phase}`
      }
      if (event.riskTemperature) {
        for (const [id] of agentNodes) {
          riskRingManager.setRisk(id, event.riskTemperature)
        }
      }
      return
    }

    const agentId = event.agent !== 'unknown' ? event.agent : null
    const sessionId = event.session ?? 'default'
    const project = event.project ?? 'unknown'
    const glowColor = getSessionColor(sessionId)
    const commandId = event.command

    // Activate skill node if command is known
    if (commandId && skillNodes.has(commandId)) {
      incrementCallCount(commandId, true)
      const skill = skillById.get(commandId)
      glowManager.activate(commandId, skill?.color)

      // Light up skill→agent connections
      if (agentId) {
        const skillConnKey = `skill:${commandId}->${agentId}`
        const skillLine = skillConnectionMap.get(skillConnKey)
        if (skillLine) {
          const mat = skillLine.material as import('three').LineDashedMaterial
          mat.opacity = 0.6
          setTimeout(() => { mat.opacity = 0.08 }, 2000)
        }

        // Particle from skill to agent
        particleSystem.emit(commandId, agentId)
      }
    }

    // Activate agent node
    if (agentId && agentNodes.has(agentId)) {
      incrementCallCount(agentId, false)
      glowManager.activate(agentId, glowColor)
      riskRingManager.recordEvent(agentId)

      // Agent→agent particle
      if (lastActiveAgent && lastActiveAgent !== agentId && agentNodes.has(lastActiveAgent)) {
        particleSystem.emit(lastActiveAgent, agentId)

        const key = `${lastActiveAgent}->${agentId}`
        const reversedKey = `${agentId}->${lastActiveAgent}`
        const line = connectionMap.get(key) ?? connectionMap.get(reversedKey)
        if (line) {
          const mat = line.material as import('three').LineBasicMaterial
          mat.opacity = 0.8
          setTimeout(() => { mat.opacity = 0.2 }, 1500)
        }
      }

      lastActiveAgent = agentId
    }

    // Update status
    const status = document.getElementById('status')
    if (status) {
      const cmd = commandId ? `/${commandId} → ` : ''
      const agentLabel = agentId ?? 'unknown'
      const toolLabel = event.tool ?? ''
      status.textContent = `[${project}] ${cmd}${agentLabel} → ${toolLabel} | ${sessionColors.size} session${sessionColors.size !== 1 ? 's' : ''}`
    }

    updateSessionLegend(sessionColors, event)
  }

  connectSSE(handleSSEEvent)

  // Render loop
  const clock = new Clock()

  const animate = () => {
    requestAnimationFrame(animate)
    const time = clock.getElapsedTime()

    controls.update()
    glowManager.update(time)
    particleSystem.update(time)
    riskRingManager.update(time)

    // Idle rotation for agent nodes
    for (const node of agentNodes.values()) {
      node.rotation.y = Math.sin(time * 0.2 + node.position.x) * 0.05
    }

    // Slow spin for skill diamonds
    for (const node of skillNodes.values()) {
      node.rotation.y = time * 0.3
      node.rotation.z = Math.PI / 4 + Math.sin(time * 0.5) * 0.05
    }

    composer.render()
  }

  animate()

  const status = document.getElementById('status')
  if (status) {
    status.textContent = `neurex-viz: ${agents.length} agents, ${skills.length} skills loaded`
  }
}

// Session legend
const sessionProjectNames = new Map<string, string>()

const updateSessionLegend = (
  sessionColors: Map<string, number>,
  latestEvent: SSEEvent,
) => {
  if (latestEvent.session && latestEvent.project) {
    sessionProjectNames.set(latestEvent.session, latestEvent.project)
  }

  let legend = document.getElementById('session-legend')
  if (!legend) {
    legend = document.createElement('div')
    legend.id = 'session-legend'
    legend.style.cssText = 'position:fixed;bottom:16px;right:16px;color:#888;font-family:monospace;font-size:12px;text-align:right;z-index:10;'
    document.body.appendChild(legend)
  }

  const lines: string[] = []
  for (const [sessionId, colorIndex] of sessionColors) {
    const color = SESSION_COLORS[colorIndex % SESSION_COLORS.length] ?? '#fff'
    const project = sessionProjectNames.get(sessionId) ?? 'unknown'
    lines.push(`<span style="color:${color}">●</span> ${project}`)
  }
  legend.innerHTML = lines.join('<br>')
}

init()
