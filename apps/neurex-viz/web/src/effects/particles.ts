import {
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector3,
  Group,
} from 'three'

interface ActiveParticle {
  mesh: Mesh
  from: Vector3
  to: Vector3
  startTime: number
  duration: number
}

export const createParticleSystem = (
  nodePositions: Map<string, Vector3>,
) => {
  const group = new Group()
  const pool: Mesh[] = []
  const active: ActiveParticle[] = []
  const POOL_SIZE = 50
  const PARTICLE_DURATION = 1.2 // seconds

  // Pre-allocate particle pool
  const geometry = new SphereGeometry(0.08, 8, 8)
  for (let i = 0; i < POOL_SIZE; i++) {
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    })
    const mesh = new Mesh(geometry, material)
    mesh.visible = false
    group.add(mesh)
    pool.push(mesh)
  }

  const emit = (fromId: string, toId: string) => {
    const from = nodePositions.get(fromId)
    const to = nodePositions.get(toId)
    if (!from || !to) return

    const mesh = pool.pop()
    if (!mesh) return

    mesh.position.copy(from)
    mesh.visible = true
    ;(mesh.material as MeshBasicMaterial).opacity = 1

    active.push({
      mesh,
      from: from.clone(),
      to: to.clone(),
      startTime: performance.now() / 1000,
      duration: PARTICLE_DURATION,
    })
  }

  const update = (time: number) => {
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i]
      if (!p) continue

      const elapsed = time - p.startTime
      const progress = Math.min(elapsed / p.duration, 1)

      // Lerp position along path with slight arc
      const pos = new Vector3().lerpVectors(p.from, p.to, progress)
      pos.y += Math.sin(progress * Math.PI) * 0.8
      p.mesh.position.copy(pos)

      // Fade out near end
      ;(p.mesh.material as MeshBasicMaterial).opacity = 1 - progress * progress

      if (progress >= 1) {
        p.mesh.visible = false
        pool.push(p.mesh)
        active.splice(i, 1)
      }
    }
  }

  return { group, emit, update }
}
