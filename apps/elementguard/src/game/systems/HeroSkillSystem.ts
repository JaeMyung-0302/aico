import Phaser from 'phaser'
import type { Element, HeroSkillData } from '@/types'
import { getHeroSkills } from '@/game/data/hero-skills'
import { EnemyEntity } from '@/game/entities/Enemy'
import { DamageText } from '@/game/entities/DamageText'

// 스킬 부가 효과 (GameScene/DebuffSystem에서 처리)
export interface SkillEffect {
  type: 'stun' | 'slow'
  targetId: string
  durationMs: number
  value: number // slow: 감속률 (0~1)
}

// 히어로 스킬 시스템 — 쿨다운 + 발동 + 이펙트
export class HeroSkillSystem {
  private scene!: Phaser.Scene
  private skills: [HeroSkillData, HeroSkillData] | null = null
  private cooldowns: [number, number] = [0, 0]
  private activeBuffs: { type: string; remainingMs: number }[] = []
  private pendingEffects: SkillEffect[] = []
  private isInitialized = false

  init(scene: Phaser.Scene, element: Element) {
    this.scene = scene
    this.skills = getHeroSkills(element)
    this.cooldowns = [0, 0]
    this.activeBuffs = []
    this.pendingEffects = []
    this.isInitialized = true
  }

  update(delta: number) {
    if (!this.isInitialized) return

    // 쿨다운 감소
    this.cooldowns[0] = Math.max(0, this.cooldowns[0] - delta / 1000)
    this.cooldowns[1] = Math.max(0, this.cooldowns[1] - delta / 1000)

    // 활성 버프 시간 감소
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.activeBuffs[i]
      if (!buff) continue
      buff.remainingMs -= delta
      if (buff.remainingMs <= 0) {
        this.activeBuffs.splice(i, 1)
      }
    }
  }

  // 스킬 사용 (0 = 스킬1, 1 = 스킬2)
  useSkill(
    skillIndex: 0 | 1,
    heroX: number,
    heroY: number,
    enemies: EnemyEntity[],
  ): boolean {
    if (!this.isInitialized || !this.skills) return false
    if (this.cooldowns[skillIndex] > 0) return false

    const skill = this.skills[skillIndex]
    if (!skill) return false

    this.cooldowns[skillIndex] = skill.cooldown

    if (skill.type === 'attack') {
      this.executeAttackSkill(skill, heroX, heroY, enemies)
    } else {
      this.executeUtilitySkill(skill, heroX, heroY, enemies)
    }

    return true
  }

  // 대기 중인 디버프 효과 소비 (GameScene에서 매 프레임 호출)
  consumePendingEffects(): SkillEffect[] {
    const effects = [...this.pendingEffects]
    this.pendingEffects = []
    return effects
  }

  private executeAttackSkill(
    skill: HeroSkillData,
    heroX: number,
    heroY: number,
    enemies: EnemyEntity[],
  ) {
    switch (skill.id) {
      case 'fire-explosion':
        this.fireExplosion(skill, heroX, heroY, enemies)
        break
      case 'water-wave':
        this.waterWave(skill, heroX, heroY, enemies)
        break
      case 'wind-slash':
        this.windSlash(skill, heroX, heroY, enemies)
        break
      case 'thunder-strike':
        this.thunderStrike(skill, heroX, heroY, enemies)
        break
      case 'earth-quake':
        this.earthQuake(skill, heroX, heroY, enemies)
        break
    }
  }

  private executeUtilitySkill(
    skill: HeroSkillData,
    heroX: number,
    heroY: number,
    enemies: EnemyEntity[],
  ) {
    switch (skill.id) {
      case 'fire-dash':
        this.activeBuffs.push({ type: 'fire-dash', remainingMs: skill.duration })
        this.showBuffEffect(heroX, heroY, 0xff4444, '불꽃 질주!')
        break
      case 'water-heal':
        this.showBuffEffect(heroX, heroY, 0x4488ff, '치유!')
        break
      case 'wind-wall':
        this.windWall(skill, heroX, heroY)
        break
      case 'thunder-field':
        this.thunderField(skill, heroX, heroY)
        break
      case 'earth-shield':
        this.activeBuffs.push({ type: 'earth-shield', remainingMs: skill.duration })
        this.showBuffEffect(heroX, heroY, 0x886644, '바위 방패!')
        break
    }
  }

  // === 공격 스킬 ===

  // 화염 폭발: 히어로 주변 범위 데미지
  private fireExplosion(skill: HeroSkillData, heroX: number, heroY: number, enemies: EnemyEntity[]) {
    const circle = this.scene.add.circle(heroX, heroY, skill.range, 0xff4444, 0.3)
    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => circle.destroy(),
    })

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dist = Phaser.Math.Distance.Between(heroX, heroY, enemy.x, enemy.y)
      if (dist <= skill.range) {
        enemy.takeDamage(skill.damage)
        new DamageText(this.scene, enemy.x, enemy.y, skill.damage, 'neutral')
      }
    }
  }

  // 해일: 전방 범위 넉백 + 데미지 (넉백은 tween 기반 시각 효과)
  private waterWave(skill: HeroSkillData, heroX: number, heroY: number, enemies: EnemyEntity[]) {
    const wave = this.scene.add.circle(heroX, heroY - skill.range / 2, skill.range / 2, 0x4488ff, 0.3)
    this.scene.tweens.add({
      targets: wave,
      y: heroY - skill.range,
      alpha: 0,
      scaleX: 2,
      duration: 500,
      onComplete: () => wave.destroy(),
    })

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dist = Phaser.Math.Distance.Between(heroX, heroY, enemy.x, enemy.y)
      if (dist <= skill.range) {
        enemy.takeDamage(skill.damage)
        new DamageText(this.scene, enemy.x, enemy.y, skill.damage, 'neutral')
        // 넉백: tween 기반 시각 효과 (경로 위치 미변경)
        const angle = Math.atan2(enemy.y - heroY, enemy.x - heroX)
        const knockX = enemy.x + Math.cos(angle) * 30
        const knockY = enemy.y + Math.sin(angle) * 30
        this.scene.tweens.add({
          targets: enemy,
          x: knockX,
          y: knockY,
          duration: 150,
          yoyo: true,
          ease: 'Power2',
        })
      }
    }
  }

  // 진공 베기: 관통 직선 데미지 (히어로 상단 방향)
  private windSlash(skill: HeroSkillData, heroX: number, heroY: number, enemies: EnemyEntity[]) {
    const line = this.scene.add.rectangle(heroX, heroY - skill.range / 2, 20, skill.range, 0x44ff88, 0.4)
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      scaleX: 0.1,
      duration: 300,
      onComplete: () => line.destroy(),
    })

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dx = Math.abs(enemy.x - heroX)
      const dy = heroY - enemy.y
      if (dx <= 40 && dy > 0 && dy <= skill.range) {
        enemy.takeDamage(skill.damage)
        new DamageText(this.scene, enemy.x, enemy.y, skill.damage, 'neutral')
      }
    }
  }

  // 낙뢰: 단일 대상 고데미지 + 1초 스턴
  private thunderStrike(skill: HeroSkillData, heroX: number, heroY: number, enemies: EnemyEntity[]) {
    let closest: EnemyEntity | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dist = Phaser.Math.Distance.Between(heroX, heroY, enemy.x, enemy.y)
      if (dist <= skill.range && dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    }

    if (!closest) return

    // 번개 이펙트
    const bolt = this.scene.add.rectangle(closest.x, closest.y - 40, 4, 80, 0xffff44, 1)
    this.scene.tweens.add({
      targets: bolt,
      alpha: 0,
      scaleX: 3,
      duration: 200,
      onComplete: () => bolt.destroy(),
    })

    closest.takeDamage(skill.damage)
    new DamageText(this.scene, closest.x, closest.y, skill.damage, 'effective')

    // 1초 스턴 효과 → GameScene의 DebuffSystem으로 전달
    this.pendingEffects.push({
      type: 'stun',
      targetId: closest.instanceId,
      durationMs: 1000,
      value: 0,
    })
  }

  // 지진: 전방 범위 데미지 + 1초 슬로우
  private earthQuake(skill: HeroSkillData, heroX: number, heroY: number, enemies: EnemyEntity[]) {
    const quake = this.scene.add.ellipse(heroX, heroY - 40, skill.range * 2, skill.range, 0x886644, 0.3)
    this.scene.tweens.add({
      targets: quake,
      alpha: 0,
      scaleY: 1.5,
      duration: 500,
      onComplete: () => quake.destroy(),
    })

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dist = Phaser.Math.Distance.Between(heroX, heroY, enemy.x, enemy.y)
      if (dist <= skill.range) {
        enemy.takeDamage(skill.damage)
        new DamageText(this.scene, enemy.x, enemy.y, skill.damage, 'neutral')
        // 1초 슬로우 → GameScene의 DebuffSystem으로 전달
        this.pendingEffects.push({
          type: 'slow',
          targetId: enemy.instanceId,
          durationMs: 1000,
          value: 0.5,
        })
      }
    }
  }

  // 버프 이펙트 텍스트 표시
  private showBuffEffect(x: number, y: number, color: number, label: string) {
    const text = this.scene.add.text(x, y - 30, label, {
      fontSize: '14px',
      color: `#${(color & 0xFFFFFF).toString(16).padStart(6, '0')}`,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    })
    text.setOrigin(0.5, 1)
    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    })
  }

  // === 유틸리티 스킬 ===

  // 바람의 벽: 영역 내 적 둔화
  private windWall(skill: HeroSkillData, heroX: number, heroY: number) {
    const zone = this.scene.add.circle(heroX, heroY, skill.range, 0x44ff88, 0.15)
    zone.setStrokeStyle(2, 0x44ff88, 0.5)
    this.activeBuffs.push({ type: 'wind-wall', remainingMs: skill.duration })

    this.scene.tweens.add({
      targets: zone,
      alpha: 0,
      duration: skill.duration,
      onComplete: () => zone.destroy(),
    })
  }

  // 자기장: 영역 내 적 공속 감소
  private thunderField(skill: HeroSkillData, heroX: number, heroY: number) {
    const zone = this.scene.add.circle(heroX, heroY, skill.range, 0xffff44, 0.15)
    zone.setStrokeStyle(2, 0xffff44, 0.5)
    this.activeBuffs.push({ type: 'thunder-field', remainingMs: skill.duration })

    this.scene.tweens.add({
      targets: zone,
      alpha: 0,
      duration: skill.duration,
      onComplete: () => zone.destroy(),
    })
  }

  // === 버프 조회 ===

  hasBuff(type: string): boolean {
    return this.activeBuffs.some((b) => b.type === type)
  }

  getDamageReduction(): number {
    if (this.hasBuff('earth-shield')) return 0.5
    if (this.hasBuff('fire-dash')) return 0.3
    return 0
  }

  isHealSkill(skillIndex: 0 | 1): boolean {
    if (!this.skills) return false
    const skill = this.skills[skillIndex]
    return skill?.id === 'water-heal'
  }

  getCooldowns(): [number, number] {
    return [Math.ceil(this.cooldowns[0]), Math.ceil(this.cooldowns[1])]
  }

  getSkills(): [HeroSkillData, HeroSkillData] | null {
    return this.skills
  }

  // 바람의 벽 영역 내 적 둔화율 반환
  getSlowZoneEffect(enemyX: number, enemyY: number, heroX: number, heroY: number): number {
    if (!this.hasBuff('wind-wall') || !this.skills) return 0
    const skill = this.skills.find((s) => s.id === 'wind-wall')
    if (!skill) return 0
    const dist = Phaser.Math.Distance.Between(heroX, heroY, enemyX, enemyY)
    return dist <= skill.range ? 0.5 : 0
  }

  // 자기장 영역 내 적 공속 감소율 반환
  getAtkSpeedReductionEffect(enemyX: number, enemyY: number, heroX: number, heroY: number): number {
    if (!this.hasBuff('thunder-field') || !this.skills) return 0
    const skill = this.skills.find((s) => s.id === 'thunder-field')
    if (!skill) return 0
    const dist = Phaser.Math.Distance.Between(heroX, heroY, enemyX, enemyY)
    return dist <= skill.range ? 0.5 : 0
  }

  destroy() {
    this.activeBuffs = []
    this.pendingEffects = []
    this.cooldowns = [0, 0]
    this.isInitialized = false
  }
}
