import type { Position, Obstacle, ObstacleConfig } from '@wasd/shared'
import { PLAYER_SIZE } from '@wasd/shared'

interface ObstacleRuntime {
  config: ObstacleConfig
  position: Position
  waypointIndex: number
  forward: boolean
}

export class ObstacleManager {
  private obstacles: ObstacleRuntime[]

  constructor(configs: readonly ObstacleConfig[]) {
    this.obstacles = configs.map((config) => {
      const firstWaypoint = config.waypoints[0]
      return {
        config,
        position: { x: firstWaypoint?.x ?? 0, y: firstWaypoint?.y ?? 0 },
        waypointIndex: 0,
        forward: true,
      }
    })
  }

  update(): void {
    for (const obs of this.obstacles) {
      if (obs.config.waypoints.length < 2) continue

      let targetIndex = obs.forward
        ? obs.waypointIndex + 1
        : obs.waypointIndex - 1
      let target = obs.config.waypoints[targetIndex]
      if (!target) {
        obs.forward = !obs.forward
        targetIndex = obs.forward
          ? obs.waypointIndex + 1
          : obs.waypointIndex - 1
        target = obs.config.waypoints[targetIndex]
        if (!target) continue
      }

      const dx = target.x - obs.position.x
      const dy = target.y - obs.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= obs.config.speed) {
        obs.position = { ...target }
        obs.waypointIndex = targetIndex
        if (
          targetIndex === 0 ||
          targetIndex === obs.config.waypoints.length - 1
        ) {
          obs.forward = !obs.forward
        }
      } else {
        obs.position = {
          x: obs.position.x + (dx / dist) * obs.config.speed,
          y: obs.position.y + (dy / dist) * obs.config.speed,
        }
      }
    }
  }

  getObstacles(): Obstacle[] {
    return this.obstacles.map((obs) => ({
      id: obs.config.id,
      position: { ...obs.position },
      size: { ...obs.config.size },
    }))
  }

  checkCollision(playerPosition: Position): boolean {
    for (const obs of this.obstacles) {
      const playerRight = playerPosition.x + PLAYER_SIZE
      const playerBottom = playerPosition.y + PLAYER_SIZE
      const obsRight = obs.position.x + obs.config.size.width
      const obsBottom = obs.position.y + obs.config.size.height

      if (
        playerPosition.x < obsRight &&
        playerRight > obs.position.x &&
        playerPosition.y < obsBottom &&
        playerBottom > obs.position.y
      ) {
        return true
      }
    }
    return false
  }
}
