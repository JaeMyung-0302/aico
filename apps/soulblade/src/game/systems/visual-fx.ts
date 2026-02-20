import Phaser from 'phaser'
import type { MapId } from '@soulblade/shared'
import type { Player } from '../entities/Player'
import type { CombatEffectLevel, JuicyConfig } from './combat'
import { ShadowSystem } from './visual/shadow'
import { ParallaxSystem } from './visual/parallax'
import { AtmosphereSystem } from './visual/atmosphere'
import { CombatEffectsSystem } from './visual/combat-effects'
import { EnvironmentParticlesSystem } from './visual/environment-particles'
import { EntityEffectsSystem } from './visual/entity-effects'

/**
 * VisualFxManager — 시각 이펙트 퍼사드
 * GameScene은 이 클래스만 참조. 서브시스템(shadow, parallax, atmosphere, combatEffects 등)을 캡슐화.
 */
export class VisualFxManager {
  private shadow: ShadowSystem
  private parallax: ParallaxSystem
  private atmosphere: AtmosphereSystem
  private combatEffects: CombatEffectsSystem
  private envParticles: EnvironmentParticlesSystem
  private entityEffects: EntityEffectsSystem

  constructor(scene: Phaser.Scene) {
    this.shadow = new ShadowSystem(scene)
    this.parallax = new ParallaxSystem(scene)
    this.atmosphere = new AtmosphereSystem(scene)
    this.combatEffects = new CombatEffectsSystem(scene)
    this.envParticles = new EnvironmentParticlesSystem(scene)
    this.entityEffects = new EntityEffectsSystem(scene)
  }

  // MapManager.loadMap 직후 호출
  onMapLoad = (mapId: MapId, worldWidth: number, worldHeight: number, parallaxLayers: number): void => {
    this.parallax.onMapLoad(mapId, worldWidth, worldHeight, parallaxLayers)
    this.atmosphere.onMapLoad(mapId)
    this.envParticles.onMapLoad(mapId)
  }

  // MapManager.unloadMap 직전 호출
  onMapUnload = (): void => {
    this.parallax.onMapUnload()
    this.atmosphere.onMapUnload()
    this.envParticles.onMapUnload()
    this.entityEffects.clearGlows()
  }

  // 플레이어 섀도우 부착 + 호흡 트윈 등록
  attachPlayerShadow = (player: Player): void => {
    this.shadow.attach(player, 'medium')
    this.entityEffects.startBreathTween(player)
  }

  // 몬스터/엘리트 섀도우 부착
  attachShadow = (entity: Phaser.Physics.Arcade.Sprite, size: 'small' | 'medium' | 'large'): void => {
    this.shadow.attach(entity, size)
  }

  detachShadow = (entity: Phaser.Physics.Arcade.Sprite): void => {
    this.shadow.detach(entity)
  }

  // GameScene.update()에서 1회 호출
  update = (
    config: JuicyConfig,
    _player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    elites: Phaser.Physics.Arcade.Group,
    camera: Phaser.Cameras.Scene2D.Camera,
    delta: number,
  ): void => {
    // 새 엔티티에 섀도우 자동 부착
    this.autoAttachShadows(enemies, 'small')
    this.autoAttachShadows(elites, 'medium')

    // 서브시스템 업데이트
    this.shadow.update(config.enableShadows)
    this.parallax.update(camera, config.enableParallax)
    this.atmosphere.update(config.enableAtmosphere)
    this.envParticles.update(camera, config.enableEnvironmentParticles, delta)
    this.entityEffects.update(config.enableEntityGlow, config.enableBreathTween, elites)
  }

  // 그룹 내 활성 엔티티에 섀도우 자동 부착
  private autoAttachShadows = (
    group: Phaser.Physics.Arcade.Group,
    size: 'small' | 'medium' | 'large',
  ): void => {
    for (const child of group.getChildren()) {
      const sprite = child as Phaser.Physics.Arcade.Sprite
      if (sprite.active) {
        this.shadow.attach(sprite, size)
      }
    }
  }

  // combat.ts에서 호출: 적 히트 시 스파크/크리티컬 플래시
  onEntityHit = (x: number, y: number, isCrit: boolean, level: CombatEffectLevel): void => {
    this.combatEffects.onEntityHit(x, y, isCrit, level)
  }

  // combat.ts에서 호출: 적 사망 시 충격파/잔류 글로우
  onEntityDeath = (x: number, y: number, entityType: 'normal' | 'elite', level: CombatEffectLevel): void => {
    this.combatEffects.onEntityDeath(x, y, entityType, level)
  }

  destroy = (): void => {
    this.shadow.destroy()
    this.parallax.destroy()
    this.atmosphere.destroy()
    this.combatEffects.destroy()
    this.envParticles.destroy()
    this.entityEffects.destroy()
  }
}
