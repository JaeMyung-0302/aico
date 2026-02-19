import Phaser from 'phaser'
import type { Element, HeroState } from '@/types'
import { HeroEntity } from '@/game/entities/Hero'
import { EnemyEntity } from '@/game/entities/Enemy'
import { HERO_BASE_STATS } from '@/game/data/hero-skills'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'
import { DamageText } from '@/game/entities/DamageText'
import { HeroSkillSystem } from '@/game/systems/HeroSkillSystem'

// 히어로 시스템 — 자동공격, 적 피격, 부활 타이머, 스킬 관리
export class HeroSystem {
  private scene!: Phaser.Scene
  private hero!: HeroEntity
  private element!: Element
  private lastAutoAtkTime = 0
  private reviveTimer = 0 // 남은 부활 시간 (초)
  private isInitialized = false
  private skillSystem = new HeroSkillSystem()

  init(scene: Phaser.Scene, element: Element) {
    // 기존 히어로 정리 (게임 재시작 등)
    if (this.isInitialized) {
      this.hero.destroy()
    }

    this.scene = scene
    this.element = element
    this.reviveTimer = 0
    this.lastAutoAtkTime = 0

    // 화면 중앙 하단에 히어로 배치
    const { width, height } = scene.scale
    this.hero = new HeroEntity(scene, width / 2, height * 0.75, element)
    this.hero.setDepth(10)

    // 스킬 시스템 초기화
    this.skillSystem.init(scene, element)
    this.isInitialized = true
  }

  update(time: number, delta: number, enemies: EnemyEntity[]): void {
    if (!this.isInitialized) return

    // 부활 대기 중
    if (this.hero.isDead) {
      if (this.reviveTimer <= 0) {
        this.reviveTimer = HERO_BASE_STATS.reviveTime
      }
      this.reviveTimer -= delta / 1000
      if (this.reviveTimer <= 0) {
        this.hero.revive()
        this.reviveTimer = 0
      }
      return
    }

    // 스킬 쿨다운/버프 업데이트
    this.skillSystem.update(delta)

    // 자동 공격
    this.processAutoAttack(time, enemies)

    // 적 근접 피격
    this.processEnemyDamage(delta, enemies)
  }

  private processAutoAttack(time: number, enemies: EnemyEntity[]) {
    const cooldownMs = 1000 / HERO_BASE_STATS.autoAtkSpeed
    if (time - this.lastAutoAtkTime < cooldownMs) return

    // 사거리 내 가장 가까운 적 찾기
    const range = HERO_BASE_STATS.autoAtkRange
    let closest: EnemyEntity | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dx = enemy.x - this.hero.x
      const dy = enemy.y - this.hero.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= range && dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    }

    if (!closest) return

    // 좌표 캡처 (적 사망 시 위치 변경 방지)
    const targetX = closest.x
    const targetY = closest.y

    // 데미지 적용 + 투사체
    closest.takeDamage(HERO_BASE_STATS.autoAtkDamage)
    this.lastAutoAtkTime = time

    // 투사체 시각 효과
    const projTexture = TEXTURE_KEYS.projectile(this.element)
    const proj = this.scene.add.image(this.hero.x, this.hero.y, projTexture)
    proj.setDisplaySize(10, 10)
    this.scene.tweens.add({
      targets: proj,
      x: targetX,
      y: targetY,
      duration: 150,
      onComplete: () => proj.destroy(),
    })

    new DamageText(this.scene, targetX, targetY, HERO_BASE_STATS.autoAtkDamage, 'neutral')
  }

  private processEnemyDamage(delta: number, enemies: EnemyEntity[]) {
    const contactRange = HERO_BASE_STATS.contactDamageRange
    const dmgPerSec = HERO_BASE_STATS.contactDamagePerSec

    for (const enemy of enemies) {
      if (enemy.isDead) continue
      const dx = enemy.x - this.hero.x
      const dy = enemy.y - this.hero.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= contactRange) {
        const damage = Math.round((dmgPerSec * delta) / 1000)
        if (damage > 0) {
          // 스킬 버프에 의한 데미지 감소 적용
          const reduction = this.skillSystem.getDamageReduction()
          const reduced = Math.round(damage * (1 - reduction))
          if (reduced > 0) {
            const died = this.hero.takeDamage(reduced)
            if (died) {
              this.reviveTimer = HERO_BASE_STATS.reviveTime
            }
          }
        }
      }
    }
  }

  // 스킬 사용 (GameScene/eventBus에서 호출)
  useSkill(skillIndex: 0 | 1, enemies: EnemyEntity[]): boolean {
    if (!this.isInitialized || this.hero.isDead) return false

    // water-heal: 히어로 HP 30% 회복
    if (this.skillSystem.isHealSkill(skillIndex)) {
      const used = this.skillSystem.useSkill(skillIndex, this.hero.x, this.hero.y, enemies)
      if (used) {
        const healAmount = Math.round(this.hero.maxHp * 0.3)
        this.hero.heal(healAmount)
      }
      return used
    }

    return this.skillSystem.useSkill(skillIndex, this.hero.x, this.hero.y, enemies)
  }

  getSkillSystem(): HeroSkillSystem {
    return this.skillSystem
  }

  getHeroState(): HeroState {
    const [cd1, cd2] = this.skillSystem.getCooldowns()
    return {
      element: this.element,
      currentHp: this.hero?.currentHp ?? 0,
      maxHp: this.hero?.maxHp ?? HERO_BASE_STATS.maxHp,
      isDead: this.hero?.isDead ?? false,
      reviveTimer: Math.ceil(this.reviveTimer),
      skill1Cooldown: cd1,
      skill2Cooldown: cd2,
    }
  }

  getHero(): HeroEntity | null {
    return this.isInitialized ? this.hero : null
  }

  destroy() {
    if (this.isInitialized) {
      this.skillSystem.destroy()
      this.hero.destroy()
      this.isInitialized = false
    }
  }
}
