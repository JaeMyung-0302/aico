import Phaser from 'phaser'
import type { MapId, WorldMapConfig, ZoneConfig, PortalConfig, NpcConfig } from '@soulblade/shared'
import { MAP_CONFIGS } from '../data/maps'
import { eventBus } from '@/lib/event-bus'

// 포탈/NPC 비주얼 표현용 게임 오브젝트
interface PortalObject {
  readonly config: PortalConfig
  readonly zone: Phaser.GameObjects.Zone
  readonly visual: Phaser.GameObjects.Rectangle
}

interface NpcObject {
  readonly config: NpcConfig
  readonly zone: Phaser.GameObjects.Zone
  readonly visual: Phaser.GameObjects.Rectangle
  readonly label: Phaser.GameObjects.Text
}

export class MapManager {
  private scene: Phaser.Scene
  private currentMapId: MapId = 'town'
  private obstacles: Phaser.Physics.Arcade.StaticGroup | null = null
  private decorations: Phaser.GameObjects.GameObject[] = []
  private portalObjects: PortalObject[] = []
  private npcObjects: NpcObject[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // 현재 맵 ID
  getCurrentMapId = (): MapId => this.currentMapId

  // 현재 맵 설정
  getCurrentMapConfig = (): WorldMapConfig => MAP_CONFIGS[this.currentMapId]

  // 맵 로드: 장애물 + 포탈 + NPC 생성
  loadMap = (mapId: MapId, player: Phaser.Physics.Arcade.Sprite): void => {
    const config = MAP_CONFIGS[mapId]
    this.currentMapId = mapId

    // 월드 바운드 설정
    this.scene.physics.world.setBounds(0, 0, config.worldSize.width, config.worldSize.height)

    // 배경색
    this.scene.cameras.main.setBackgroundColor(config.backgroundColor)

    // 카메라 바운드
    this.scene.cameras.main.setBounds(0, 0, config.worldSize.width, config.worldSize.height)

    // 장애물 + 장식 생성
    this.obstacles = this.scene.physics.add.staticGroup()
    for (const obs of config.obstacles) {
      const alpha = obs.alpha ?? 0.6
      const shapeType = obs.type ?? 'rect'
      let gameObj: Phaser.GameObjects.GameObject

      switch (shapeType) {
        case 'circle': {
          const r = obs.radius ?? obs.width / 2
          const circle = this.scene.add.circle(obs.x, obs.y, r, obs.color, alpha)
          circle.setDepth(1)
          gameObj = circle
          break
        }
        case 'triangle': {
          const tri = this.scene.add.triangle(
            obs.x, obs.y,
            0, obs.height,
            obs.width / 2, 0,
            obs.width, obs.height,
            obs.color, alpha,
          )
          tri.setDepth(1)
          gameObj = tri
          break
        }
        case 'ellipse': {
          const ellipse = this.scene.add.ellipse(obs.x, obs.y, obs.width, obs.height, obs.color, alpha)
          ellipse.setDepth(1)
          gameObj = ellipse
          break
        }
        default: {
          const rect = this.scene.add.rectangle(obs.x, obs.y, obs.width, obs.height, obs.color)
          rect.setAlpha(alpha)
          rect.setDepth(1)
          gameObj = rect
          break
        }
      }

      if (obs.collidable !== false) {
        this.obstacles.add(gameObj)
        // circle/ellipse: 물리 바디를 원형으로 보정
        if (shapeType === 'circle') {
          const body = (gameObj as Phaser.GameObjects.Shape).body as Phaser.Physics.Arcade.StaticBody
          const r = obs.radius ?? obs.width / 2
          body.setCircle(r)
        }
      } else {
        this.decorations.push(gameObj)
      }
    }

    // 장애물 ↔ 플레이어 충돌
    this.scene.physics.add.collider(player, this.obstacles)

    // 포탈 생성
    this.createPortals(config.portals, player)

    // NPC 생성
    this.createNpcs(config.npcs, player)

    // 맵 이름 알림
    eventBus.emit('hud:mapName', { name: config.name })
  }

  // 맵 언로드: 모든 오브젝트 제거
  unloadMap = (): void => {
    // 장애물 제거
    if (this.obstacles) {
      this.obstacles.clear(true, true)
      this.obstacles = null
    }

    // 장식 제거
    for (const deco of this.decorations) {
      deco.destroy()
    }
    this.decorations = []

    // 포탈 제거
    for (const portal of this.portalObjects) {
      portal.visual.destroy()
      portal.zone.destroy()
    }
    this.portalObjects = []

    // NPC 제거
    for (const npc of this.npcObjects) {
      npc.visual.destroy()
      npc.label.destroy()
      npc.zone.destroy()
    }
    this.npcObjects = []
  }

  // 장애물 그룹 반환 (몬스터 충돌용)
  getObstacles = (): Phaser.Physics.Arcade.StaticGroup | null => this.obstacles

  // 좌표가 속한 Zone 반환
  getZoneAt = (x: number, y: number): ZoneConfig | null => {
    const config = MAP_CONFIGS[this.currentMapId]
    for (const zone of config.zones) {
      const b = zone.bounds
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        return zone
      }
    }
    return null
  }

  // 현재 맵의 모든 Zone 반환
  getZones = (): readonly ZoneConfig[] => MAP_CONFIGS[this.currentMapId].zones

  // 안전지대 여부
  isSafeZone = (): boolean => MAP_CONFIGS[this.currentMapId].isSafeZone

  // 정리
  destroy = (): void => {
    this.unloadMap()
  }

  // --- Private ---

  private createPortals = (
    portals: readonly PortalConfig[],
    player: Phaser.Physics.Arcade.Sprite,
  ): void => {
    for (const portal of portals) {
      // 시각적 표현 (파란색 반투명 사각형)
      const visual = this.scene.add.rectangle(
        portal.position.x,
        portal.position.y,
        portal.size.width,
        portal.size.height,
        0x4444ff,
      )
      visual.setAlpha(0.4)
      visual.setDepth(2)

      // 트리거 존 (물리 overlap)
      const zone = this.scene.add.zone(
        portal.position.x,
        portal.position.y,
        portal.size.width,
        portal.size.height,
      )
      this.scene.physics.add.existing(zone, true) // static body

      // 플레이어 overlap → 포탈 이벤트
      this.scene.physics.add.overlap(
        player,
        zone,
        () => this.onPortalEnter(portal),
        undefined,
        this,
      )

      this.portalObjects.push({ config: portal, zone, visual })
    }
  }

  private createNpcs = (
    npcs: readonly NpcConfig[],
    player: Phaser.Physics.Arcade.Sprite,
  ): void => {
    for (const npc of npcs) {
      // NPC 비주얼 (초록색 사각형)
      const visual = this.scene.add.rectangle(
        npc.position.x,
        npc.position.y,
        32,
        48,
        0x44cc44,
      )
      visual.setDepth(5)

      // 이름 표시
      const label = this.scene.add.text(
        npc.position.x,
        npc.position.y - 36,
        npc.label,
        { fontSize: '12px', color: '#ffffff', align: 'center' },
      )
      label.setOrigin(0.5)
      label.setDepth(6)

      // 인터랙션 존 (넓은 범위)
      const zone = this.scene.add.zone(
        npc.position.x,
        npc.position.y,
        64,
        80,
      )
      this.scene.physics.add.existing(zone, true)

      this.scene.physics.add.overlap(
        player,
        zone,
        () => this.onNpcInteract(npc),
        undefined,
        this,
      )

      this.npcObjects.push({ config: npc, zone, visual, label })
    }
  }

  // 포탈 진입 쿨다운 (연속 트리거 방지)
  private portalCooldown = false

  private onPortalEnter = (portal: PortalConfig): void => {
    if (this.portalCooldown) return
    this.portalCooldown = true

    eventBus.emit('portal:enter', {
      portalId: portal.id,
      targetMapId: portal.targetMapId,
      targetSpawnPoint: portal.targetSpawnPoint,
      recommendedLevel: portal.recommendedLevel,
      label: portal.label,
    })

    // 1초 후 쿨다운 해제
    this.scene.time.delayedCall(1000, () => {
      this.portalCooldown = false
    })
  }

  // NPC 인터랙션 쿨다운
  private npcCooldown = false

  private onNpcInteract = (npc: NpcConfig): void => {
    if (this.npcCooldown) return
    this.npcCooldown = true

    eventBus.emit('npc:interact', {
      npcId: npc.id,
      npcType: npc.type,
      label: npc.label,
    })

    this.scene.time.delayedCall(1000, () => {
      this.npcCooldown = false
    })
  }
}
