import Phaser from 'phaser'
import type {
  MapId,
  WorldMapConfig,
  ZoneConfig,
  PortalConfig,
  NpcConfig,
  ObstacleConfig,
} from '@soulblade/shared'
import { MAP_CONFIGS } from '../data/maps'
import { BG_TEXTURES } from '../texture-keys'
import { eventBus } from '@/lib/event-bus'

// 포탈/NPC 비주얼 표현용 게임 오브젝트
interface PortalObject {
  readonly config: PortalConfig
  readonly zone: Phaser.GameObjects.Zone
  readonly visual: Phaser.GameObjects.Graphics
}

interface NpcObject {
  readonly config: NpcConfig
  readonly zone: Phaser.GameObjects.Zone
  readonly visual: Phaser.GameObjects.Graphics
  readonly label: Phaser.GameObjects.Text
}

export class MapManager {
  private scene: Phaser.Scene
  private currentMapId: MapId = 'town'
  private obstacles: Phaser.Physics.Arcade.StaticGroup | null = null
  private obstacleVisuals: Phaser.GameObjects.Graphics[] = []
  private decorations: Phaser.GameObjects.GameObject[] = []
  private portalObjects: PortalObject[] = []
  private npcObjects: NpcObject[] = []
  private backgroundTile: Phaser.GameObjects.TileSprite | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // 현재 맵 ID
  getCurrentMapId = (): MapId => this.currentMapId

  // 현재 맵 설정
  getCurrentMapConfig = (): WorldMapConfig => MAP_CONFIGS[this.currentMapId]

  // 맵 로드: 배경 + 장애물 + 포탈 + NPC 생성
  loadMap = (mapId: MapId, player: Phaser.Physics.Arcade.Sprite): void => {
    const config = MAP_CONFIGS[mapId]
    this.currentMapId = mapId

    // 월드 바운드 설정
    this.scene.physics.world.setBounds(
      0,
      0,
      config.worldSize.width,
      config.worldSize.height,
    )

    // 배경색
    this.scene.cameras.main.setBackgroundColor(config.backgroundColor)

    // 카메라 바운드
    this.scene.cameras.main.setBounds(
      0,
      0,
      config.worldSize.width,
      config.worldSize.height,
    )

    // 타일 배경
    this.createBackground(
      mapId,
      config.worldSize.width,
      config.worldSize.height,
    )

    // 장애물 + 장식 생성 (테마별)
    this.obstacles = this.scene.physics.add.staticGroup()
    this.createThemedObstacles(config.obstacles, mapId)

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
    // 쿨다운 타이머 정리
    this.portalCooldownTimer?.remove(false)
    this.portalCooldownTimer = null
    this.portalCooldown = false
    this.npcCooldownTimer?.remove(false)
    this.npcCooldownTimer = null
    this.npcCooldown = false

    // 배경 제거
    if (this.backgroundTile) {
      this.backgroundTile.destroy()
      this.backgroundTile = null
    }

    // 장애물 제거
    if (this.obstacles) {
      this.obstacles.clear(true, true)
      this.obstacles = null
    }
    for (const vis of this.obstacleVisuals) {
      vis.destroy()
    }
    this.obstacleVisuals = []

    // 장식 제거
    for (const deco of this.decorations) {
      deco.destroy()
    }
    this.decorations = []

    // 포탈 제거 (tween kill + destroy)
    for (const portal of this.portalObjects) {
      this.scene.tweens.killTweensOf(portal.visual)
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

  // --- Private: 배경 ---

  private createBackground = (
    mapId: MapId,
    width: number,
    height: number,
  ): void => {
    this.backgroundTile = this.scene.add.tileSprite(
      width / 2,
      height / 2,
      width,
      height,
      BG_TEXTURES[mapId],
    )
    this.backgroundTile.setDepth(-1)
  }

  // --- Private: 테마별 장애물 ---

  private createThemedObstacles = (
    obstacles: readonly ObstacleConfig[],
    mapId: MapId,
  ): void => {
    for (const obs of obstacles) {
      const shapeType = obs.type ?? 'rect'

      // 투명 물리 바디 (충돌 전용)
      let gameObj: Phaser.GameObjects.GameObject
      switch (shapeType) {
        case 'circle': {
          const r = obs.radius ?? obs.width / 2
          const circle = this.scene.add.circle(obs.x, obs.y, r, 0x000000, 0)
          circle.setDepth(1)
          gameObj = circle
          break
        }
        case 'triangle': {
          const tri = this.scene.add.triangle(
            obs.x,
            obs.y,
            0,
            obs.height,
            obs.width / 2,
            0,
            obs.width,
            obs.height,
            0x000000,
            0,
          )
          tri.setDepth(1)
          gameObj = tri
          break
        }
        case 'ellipse': {
          const ellipse = this.scene.add.ellipse(
            obs.x,
            obs.y,
            obs.width,
            obs.height,
            0x000000,
            0,
          )
          ellipse.setDepth(1)
          gameObj = ellipse
          break
        }
        default: {
          const rect = this.scene.add.rectangle(
            obs.x,
            obs.y,
            obs.width,
            obs.height,
            0x000000,
            0,
          )
          rect.setDepth(1)
          gameObj = rect
          break
        }
      }

      if (obs.collidable !== false) {
        this.obstacles!.add(gameObj)
        if (shapeType === 'circle') {
          const body = (gameObj as Phaser.GameObjects.Shape)
            .body as Phaser.Physics.Arcade.StaticBody
          const r = obs.radius ?? obs.width / 2
          body.setCircle(r)
        }
      } else {
        this.decorations.push(gameObj)
      }

      // 테마별 비주얼 오버레이
      const visual = this.scene.add.graphics()
      visual.setDepth(1)
      this.drawThemedObstacle(visual, obs, mapId)
      this.obstacleVisuals.push(visual)
    }
  }

  private drawThemedObstacle = (
    g: Phaser.GameObjects.Graphics,
    obs: ObstacleConfig,
    mapId: MapId,
  ): void => {
    switch (mapId) {
      case 'town':
        this.drawTownObstacle(g, obs)
        break
      case 'serpent_forest':
        this.drawForestObstacle(g, obs)
        break
      case 'ice_cave':
        this.drawIceObstacle(g, obs)
        break
      case 'flame_castle':
        this.drawFlameObstacle(g, obs)
        break
    }
  }

  // 마을: 돌벽, 우물
  private drawTownObstacle = (
    g: Phaser.GameObjects.Graphics,
    obs: ObstacleConfig,
  ): void => {
    const { x, y, width: w, height: h } = obs
    const hw = w / 2
    const hh = h / 2

    if (obs.type === 'circle') {
      const r = obs.radius ?? w / 2
      // 돌 우물
      g.fillStyle(0x555544, 1)
      g.fillCircle(x, y, r)
      g.lineStyle(2, 0x444433, 1)
      g.strokeCircle(x, y, r)
      g.fillStyle(0x223344, 0.8)
      g.fillCircle(x, y, r * 0.6)
      g.lineStyle(1, 0x666655, 0.6)
      g.strokeCircle(x, y, r * 0.85)
    } else {
      // 돌벽 + 벽돌 패턴
      g.fillStyle(0x665544, 1)
      g.fillRect(x - hw, y - hh, w, h)
      g.lineStyle(1, 0x554433, 0.6)
      const brickH = 8
      for (let row = 0; row < Math.ceil(h / brickH); row++) {
        const by = y - hh + row * brickH
        g.strokeRect(x - hw, by, w, brickH)
        const offset = row % 2 === 0 ? 0 : 12
        for (let bx = x - hw + offset; bx < x + hw; bx += 24) {
          g.beginPath()
          g.moveTo(bx, by)
          g.lineTo(bx, by + brickH)
          g.strokePath()
        }
      }
      g.fillStyle(0x776655, 0.4)
      g.fillRect(x - hw, y - hh, w, 2)
    }
  }

  // 뱀의 숲: 고목, 덤불
  private drawForestObstacle = (
    g: Phaser.GameObjects.Graphics,
    obs: ObstacleConfig,
  ): void => {
    const { x, y, width: w, height: h } = obs
    const hw = w / 2
    const hh = h / 2

    if (obs.type === 'circle') {
      const r = obs.radius ?? w / 2
      // 가시 덤불
      g.fillStyle(0x2a4422, 0.9)
      g.fillCircle(x, y, r)
      g.fillStyle(0x335522, 0.7)
      g.fillCircle(x - r * 0.3, y - r * 0.2, r * 0.6)
      g.fillCircle(x + r * 0.4, y - r * 0.1, r * 0.5)
      g.lineStyle(1, 0x556633, 0.8)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        g.beginPath()
        g.moveTo(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7)
        g.lineTo(x + Math.cos(angle) * r * 1.1, y + Math.sin(angle) * r * 1.1)
        g.strokePath()
      }
    } else if (obs.type === 'triangle') {
      // 고목 뿌리
      g.fillStyle(0x443322, 1)
      g.fillTriangle(x, y - hh, x - hw, y + hh, x + hw, y + hh)
      g.lineStyle(1, 0x332211, 0.6)
      g.beginPath()
      g.moveTo(x, y - hh)
      g.lineTo(x - 2, y + hh)
      g.strokePath()
    } else {
      // 쓰러진 통나무
      g.fillStyle(0x443322, 1)
      g.fillRoundedRect(x - hw, y - hh, w, h, 4)
      g.lineStyle(1, 0x332211, 0.4)
      for (let i = 0; i < 3; i++) {
        const ly = y - hh + (h / 4) * (i + 1)
        g.beginPath()
        g.moveTo(x - hw + 2, ly)
        g.lineTo(x + hw - 2, ly)
        g.strokePath()
      }
      g.fillStyle(0x334422, 0.5)
      g.fillCircle(x - hw + 6, y - 2, 4)
      g.fillCircle(x + hw - 8, y + 2, 3)
    }
  }

  // 얼음 동굴: 빙벽, 결정
  private drawIceObstacle = (
    g: Phaser.GameObjects.Graphics,
    obs: ObstacleConfig,
  ): void => {
    const { x, y, width: w, height: h } = obs
    const hw = w / 2
    const hh = h / 2

    if (obs.type === 'circle') {
      const r = obs.radius ?? w / 2
      // 얼음 결정
      g.fillStyle(0x4488cc, 0.7)
      g.fillCircle(x, y, r)
      g.fillStyle(0x88ccff, 0.4)
      g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.35)
      g.lineStyle(2, 0x6699dd, 0.6)
      g.strokeCircle(x, y, r)
    } else if (obs.type === 'triangle') {
      // 고드름
      g.fillStyle(0x5599cc, 0.8)
      g.fillTriangle(x, y - hh, x - hw, y + hh, x + hw, y + hh)
      g.fillStyle(0xaaddff, 0.3)
      g.fillTriangle(x - 2, y - hh + 4, x - hw + 4, y + hh - 4, x, y + hh - 4)
      g.lineStyle(1, 0x88ccff, 0.5)
      g.beginPath()
      g.moveTo(x, y - hh)
      g.lineTo(x + hw, y + hh)
      g.strokePath()
    } else {
      // 빙벽
      g.fillStyle(0x3366aa, 0.8)
      g.fillRect(x - hw, y - hh, w, h)
      g.lineStyle(1, 0x5588cc, 0.4)
      g.beginPath()
      g.moveTo(x - hw, y - hh + h * 0.3)
      g.lineTo(x, y)
      g.lineTo(x + hw, y - hh + h * 0.4)
      g.strokePath()
      g.fillStyle(0x88bbee, 0.2)
      g.fillRect(x - hw, y - hh, w * 0.3, h)
      g.lineStyle(1, 0x4477aa, 0.7)
      g.strokeRect(x - hw, y - hh, w, h)
    }
  }

  // 화염의 성: 용암석, 흑요석
  private drawFlameObstacle = (
    g: Phaser.GameObjects.Graphics,
    obs: ObstacleConfig,
  ): void => {
    const { x, y, width: w, height: h } = obs
    const hw = w / 2
    const hh = h / 2

    if (obs.type === 'circle') {
      const r = obs.radius ?? w / 2
      // 용암석
      g.fillStyle(0x442211, 1)
      g.fillCircle(x, y, r)
      g.lineStyle(1.5, 0xff4400, 0.6)
      g.beginPath()
      g.moveTo(x - r * 0.5, y - r * 0.3)
      g.lineTo(x, y)
      g.lineTo(x + r * 0.3, y + r * 0.5)
      g.strokePath()
      g.fillStyle(0xff6600, 0.15)
      g.fillCircle(x, y, r * 1.2)
    } else if (obs.type === 'triangle') {
      // 불기둥
      g.fillStyle(0x331111, 1)
      g.fillTriangle(x, y - hh, x - hw, y + hh, x + hw, y + hh)
      g.fillStyle(0xff4400, 0.3)
      g.fillTriangle(
        x,
        y - hh - 4,
        x - hw * 0.5,
        y - hh + 8,
        x + hw * 0.5,
        y - hh + 8,
      )
      g.fillStyle(0xffaa00, 0.4)
      g.fillCircle(x, y - hh, 3)
    } else {
      // 흑요석 벽
      g.fillStyle(0x221111, 1)
      g.fillRect(x - hw, y - hh, w, h)
      g.lineStyle(1, 0xaa3300, 0.5)
      g.beginPath()
      g.moveTo(x - hw + 2, y - hh + h * 0.2)
      g.lineTo(x, y)
      g.lineTo(x + hw - 3, y + hh - h * 0.3)
      g.strokePath()
      g.fillStyle(0xff4400, 0.1)
      g.fillRect(x - 2, y - 2, 4, 4)
      g.lineStyle(1, 0x331111, 0.8)
      g.strokeRect(x - hw, y - hh, w, h)
    }
  }

  // --- Private: 포탈 마법진 ---

  private createPortals = (
    portals: readonly PortalConfig[],
    player: Phaser.Physics.Arcade.Sprite,
  ): void => {
    for (const portal of portals) {
      const px = portal.position.x
      const py = portal.position.y
      const pw = portal.size.width
      const ph = portal.size.height
      const radius = Math.max(pw, ph) / 2

      // 마법진 비주얼
      const visual = this.scene.add.graphics()
      visual.setPosition(px, py)
      visual.setDepth(2)

      // 바닥 글로우
      visual.fillStyle(0x3344aa, 0.15)
      visual.fillCircle(0, 0, radius + 4)

      // 외곽 원
      visual.lineStyle(2, 0x4466ff, 0.8)
      visual.strokeCircle(0, 0, radius)

      // 중간 원
      visual.lineStyle(1.5, 0x6688ff, 0.5)
      visual.strokeCircle(0, 0, radius * 0.7)

      // 내부 글로우
      visual.fillStyle(0x4466ff, 0.2)
      visual.fillCircle(0, 0, radius * 0.5)

      // 중심 밝은 점
      visual.fillStyle(0x88aaff, 0.4)
      visual.fillCircle(0, 0, radius * 0.15)

      // 룬 마크 (외곽 원 위에)
      const runeCount = 8
      for (let i = 0; i < runeCount; i++) {
        const angle = (i / runeCount) * Math.PI * 2
        const rx = Math.cos(angle) * radius * 0.85
        const ry = Math.sin(angle) * radius * 0.85
        visual.fillStyle(0x88aaff, 0.6)
        visual.fillRect(rx - 2, ry - 1, 4, 2)
      }

      // 회전 tween
      this.scene.tweens.add({
        targets: visual,
        rotation: Math.PI * 2,
        duration: 8000,
        repeat: -1,
        ease: 'Linear',
      })

      // 트리거 존 (물리 overlap)
      const zone = this.scene.add.zone(px, py, pw, ph)
      this.scene.physics.add.existing(zone, true)

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

  // --- Private: NPC 구조물 ---

  private createNpcs = (
    npcs: readonly NpcConfig[],
    player: Phaser.Physics.Arcade.Sprite,
  ): void => {
    for (const npc of npcs) {
      const nx = npc.position.x
      const ny = npc.position.y

      // NPC 건물 비주얼
      const visual = this.scene.add.graphics()
      visual.setDepth(5)

      switch (npc.type) {
        case 'shop':
          this.drawShopBuilding(visual, nx, ny)
          break
        case 'blacksmith':
          this.drawBlacksmithBuilding(visual, nx, ny)
          break
        default:
          this.drawGenericNpc(visual, nx, ny)
          break
      }

      // 이름 표시
      const label = this.scene.add.text(nx, ny - 40, npc.label, {
        fontSize: '11px',
        color: '#ffddaa',
        align: 'center',
        fontStyle: 'bold',
      })
      label.setOrigin(0.5)
      label.setDepth(6)

      // 인터랙션 존 (넓은 범위)
      const zone = this.scene.add.zone(nx, ny, 64, 80)
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

  // 상점 건물
  private drawShopBuilding = (
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
  ): void => {
    // 건물 본체
    g.fillStyle(0x665533, 1)
    g.fillRoundedRect(x - 18, y - 20, 36, 32, 2)
    // 지붕
    g.fillStyle(0x884422, 1)
    g.fillTriangle(x - 22, y - 18, x, y - 34, x + 22, y - 18)
    // 차양
    g.fillStyle(0xaa5533, 0.8)
    g.fillRect(x - 20, y - 6, 40, 4)
    // 창문 (따뜻한 불빛)
    g.fillStyle(0xddaa44, 0.6)
    g.fillRect(x - 12, y - 14, 8, 8)
    g.fillRect(x + 4, y - 14, 8, 8)
    // 문
    g.fillStyle(0x443322, 1)
    g.fillRoundedRect(x - 5, y, 10, 12, 3)
    // 상품 진열
    g.fillStyle(0xccaa44, 0.5)
    g.fillRect(x - 16, y + 2, 6, 4)
    g.fillRect(x - 16, y + 7, 4, 3)
    // 간판
    g.fillStyle(0x886633, 1)
    g.fillRect(x + 14, y - 16, 2, 10)
    g.fillStyle(0xddaa44, 0.8)
    g.fillRect(x + 10, y - 18, 10, 6)
  }

  // 대장간
  private drawBlacksmithBuilding = (
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
  ): void => {
    // 건물 본체 (돌)
    g.fillStyle(0x555544, 1)
    g.fillRoundedRect(x - 18, y - 18, 36, 30, 2)
    // 지붕
    g.fillStyle(0x444444, 1)
    g.fillRect(x - 20, y - 20, 40, 5)
    // 굴뚝
    g.fillStyle(0x555555, 1)
    g.fillRect(x + 8, y - 30, 6, 12)
    // 연기
    g.fillStyle(0x888888, 0.2)
    g.fillCircle(x + 11, y - 34, 4)
    g.fillCircle(x + 13, y - 38, 3)
    // 화덕 빛
    g.fillStyle(0xff6600, 0.3)
    g.fillRect(x - 14, y - 10, 12, 8)
    g.fillStyle(0xffaa00, 0.2)
    g.fillCircle(x - 8, y - 6, 5)
    // 모루
    g.fillStyle(0x444455, 1)
    g.fillRect(x + 6, y + 4, 8, 4)
    g.fillRect(x + 8, y + 8, 4, 4)
    // 문
    g.fillStyle(0x333322, 1)
    g.fillRoundedRect(x - 5, y, 10, 12, 3)
  }

  // 일반 NPC (portal_guide 등)
  private drawGenericNpc = (
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
  ): void => {
    // 석상 기둥
    g.fillStyle(0x667766, 1)
    g.fillRoundedRect(x - 10, y - 24, 20, 40, 3)
    // 기둥 줄 장식
    g.lineStyle(1, 0x778877, 0.6)
    g.strokeRect(x - 8, y - 20, 16, 32)
    // 상단 문양 (원)
    g.fillStyle(0x88aa88, 0.6)
    g.fillCircle(x, y - 14, 5)
    // 빛 이펙트
    g.fillStyle(0xaaccaa, 0.2)
    g.fillCircle(x, y - 14, 8)
    // 받침대
    g.fillStyle(0x556655, 1)
    g.fillRect(x - 12, y + 14, 24, 4)
  }

  // --- Private: 이벤트 핸들러 ---

  // 포탈 진입 쿨다운 (연속 트리거 방지)
  private portalCooldown = false
  private portalCooldownTimer: Phaser.Time.TimerEvent | null = null

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
    this.portalCooldownTimer = this.scene.time.delayedCall(1000, () => {
      this.portalCooldown = false
      this.portalCooldownTimer = null
    })
  }

  // NPC 인터랙션 쿨다운
  private npcCooldown = false
  private npcCooldownTimer: Phaser.Time.TimerEvent | null = null

  private onNpcInteract = (npc: NpcConfig): void => {
    if (this.npcCooldown) return
    this.npcCooldown = true

    eventBus.emit('npc:interact', {
      npcId: npc.id,
      npcType: npc.type,
      label: npc.label,
    })

    this.npcCooldownTimer = this.scene.time.delayedCall(1000, () => {
      this.npcCooldown = false
      this.npcCooldownTimer = null
    })
  }
}
