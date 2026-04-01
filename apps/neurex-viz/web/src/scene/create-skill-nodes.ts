import {
  OctahedronGeometry,
  MeshStandardMaterial,
  Mesh,
  Vector3,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from 'three'
import type { SkillMeta } from '@neurex-viz/shared'

const createSkillLabel = (text: string, color: string): Sprite => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext('2d')!

  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.globalAlpha = 0.9
  ctx.fillText(text, 256, 60)

  const texture = new CanvasTexture(canvas)
  const material = new SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 })
  const sprite = new Sprite(material)
  sprite.scale.set(3.5, 0.8, 1)
  return sprite
}

export const createSkillNodes = (
  skills: SkillMeta[],
  positions: Map<string, Vector3>,
): Map<string, Mesh> => {
  const nodes = new Map<string, Mesh>()

  for (const skill of skills) {
    const pos = positions.get(skill.id)
    if (!pos) continue

    // Larger diamond — visible but hollow feel
    const geometry = new OctahedronGeometry(0.4, 0)

    // Semi-transparent fill
    const material = new MeshStandardMaterial({
      color: skill.color,
      emissive: skill.color,
      emissiveIntensity: 0.15,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
    })

    const mesh = new Mesh(geometry, material)
    mesh.position.copy(pos)
    mesh.rotation.set(0, 0, Math.PI / 4)
    mesh.userData = { skillId: skill.id, isSkill: true }

    // Bold wireframe outline
    const edges = new EdgesGeometry(geometry)
    const wireframe = new LineSegments(
      edges,
      new LineBasicMaterial({
        color: skill.color,
        transparent: true,
        opacity: 0.9,
      }),
    )
    mesh.add(wireframe)

    // Label below
    const label = createSkillLabel(skill.name, skill.color)
    label.position.set(0, -0.8, 0)
    mesh.add(label)

    nodes.set(skill.id, mesh)
  }

  return nodes
}
