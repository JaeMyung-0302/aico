import Phaser from "phaser";
import { GAME_CONSTANTS } from "@land-of-splendid-rivers-and-mountains/shared";
import type { MonsterDefinition } from "@land-of-splendid-rivers-and-mountains/shared";

type MonsterAIState = "idle" | "patrol" | "chase" | "attack" | "knockback";
type Direction = "down" | "up" | "left" | "right";

const DETECTION_RANGE = 128;
const DETECTION_RANGE_SQ = DETECTION_RANGE * DETECTION_RANGE;
const ATTACK_RANGE = 28;
const ATTACK_RANGE_SQ = ATTACK_RANGE * ATTACK_RANGE;
const LOSE_RANGE = 192;
const LOSE_RANGE_SQ = LOSE_RANGE * LOSE_RANGE;
const PATROL_PAUSE_MIN = 1500;
const PATROL_PAUSE_MAX = 3500;
const ATTACK_COOLDOWN = 1000;
const KNOCKBACK_DURATION = 200;
const HIT_FLASH_DURATION = 150;
const ANIM_FRAME_RATE = 6;
const IDLE_FRAMES: Record<Direction, number> = {
  down: 0,
  up: 4,
  left: 8,
  right: 12,
};

export class Monster {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private _id: string;
  private _definition: MonsterDefinition;

  get id(): string {
    return this._id;
  }

  get definition(): MonsterDefinition {
    return this._definition;
  }

  private hp: number;
  private aiState: MonsterAIState = "idle";
  private patrolTimer = 0;
  private patrolPause = 0;
  private patrolDirection: { x: number; y: number } = { x: 0, y: 0 };
  private attackCooldown = 0;
  private knockbackTimer = 0;
  private spawnX: number;
  private spawnY: number;
  private dead = false;
  private facing: Direction = "down";
  private hasAnimations = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: MonsterDefinition,
    instanceId: string,
  ) {
    this._id = instanceId;
    this._definition = def;
    this.hp = def.hp;
    this.spawnX = x;
    this.spawnY = y;

    const textureKey = `monster-${def.id}`;
    const key = scene.textures.exists(textureKey)
      ? textureKey
      : "monster-default";
    this.sprite = scene.physics.add.sprite(x, y, key);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData("monsterId", instanceId);

    if (key !== "monster-default") {
      this.createAnimations(scene, key);
    }

    const size = GAME_CONSTANTS.TILE_SIZE;
    const body = this.sprite.body;
    if (body) {
      const frameH = this.sprite.height;
      body.setSize(size * 0.8, size * 0.8);
      body.setOffset((frameH - size * 0.8) / 2, frameH - size * 0.8 - 2);
    }
  }

  update(delta: number, playerX: number, playerY: number): void {
    if (this.dead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    if (this.aiState === "knockback") {
      this.knockbackTimer -= delta;
      if (this.knockbackTimer <= 0) {
        this.aiState = "chase";
      }
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= ATTACK_RANGE_SQ && this.attackCooldown <= 0) {
      this.aiState = "attack";
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (distSq <= DETECTION_RANGE_SQ) {
      this.aiState = "chase";
      const dist = Math.sqrt(distSq);
      this.chase(dx, dy, dist);
      this.updateAnimation();
      return;
    }

    if (this.aiState === "chase" && distSq > LOSE_RANGE_SQ) {
      this.aiState = "patrol";
    }

    if (this.aiState === "chase") {
      const dist = Math.sqrt(distSq);
      this.chase(dx, dy, dist);
      this.updateAnimation();
      return;
    }

    this.patrol(delta);
    this.updateAnimation();
  }

  takeDamage(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    knockbackForce: number,
  ): boolean {
    if (this.dead) return false;

    const actualDamage = Math.max(1, damage - this.definition.defense);
    this.hp -= actualDamage;

    this.sprite.setTint(0xff0000);
    const currentId = this._id;
    this.sprite.scene.time.delayedCall(HIT_FLASH_DURATION, () => {
      if (!this.dead && this._id === currentId) this.sprite.clearTint();
    });

    const dist = Math.sqrt(knockbackX * knockbackX + knockbackY * knockbackY);
    if (dist > 0) {
      const nx = knockbackX / dist;
      const ny = knockbackY / dist;
      this.sprite.setVelocity(nx * knockbackForce, ny * knockbackForce);
      this.aiState = "knockback";
      this.knockbackTimer = KNOCKBACK_DURATION;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.sprite.setVelocity(0, 0);
      return true;
    }

    return false;
  }

  canAttack(): boolean {
    return this.aiState === "attack" && this.attackCooldown <= 0 && !this.dead;
  }

  markAttacked(): void {
    this.attackCooldown = ATTACK_COOLDOWN;
    this.aiState = "chase";
  }

  isDead(): boolean {
    return this.dead;
  }

  getHp(): number {
    return this.hp;
  }

  applyModifier(hpMult: number, atkMult: number): void {
    this.hp = Math.floor(this.hp * hpMult);
    this._definition = {
      ...this._definition,
      attack: Math.floor(this._definition.attack * atkMult),
    };
  }

  reset(
    x: number,
    y: number,
    def: MonsterDefinition,
    instanceId: string,
  ): void {
    this._id = instanceId;
    this._definition = def;
    this.hp = def.hp;
    this.spawnX = x;
    this.spawnY = y;
    this.dead = false;
    this.aiState = "idle";
    this.facing = "down";
    this.patrolTimer = 0;
    this.patrolPause = 0;
    this.patrolDirection = { x: 0, y: 0 };
    this.attackCooldown = 0;
    this.knockbackTimer = 0;

    const textureKey = `monster-${def.id}`;
    const key = this.sprite.scene.textures.exists(textureKey)
      ? textureKey
      : "monster-default";
    this.sprite.setTexture(key);
    if (key !== "monster-default") {
      this.createAnimations(this.sprite.scene, key);
    } else {
      this.hasAnimations = false;
    }

    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    this.sprite.setActive(true).setVisible(true);
    this.sprite.setData("monsterId", instanceId);
  }

  deactivate(): void {
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setVelocity(0, 0);
    this.sprite.setPosition(-999, -999);
    this.dead = true;
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private chase(dx: number, dy: number, dist: number): void {
    if (dist === 0) return;
    const nx = dx / dist;
    const ny = dy / dist;
    this.sprite.setVelocity(
      nx * this.definition.speed,
      ny * this.definition.speed,
    );
  }

  private createAnimations(scene: Phaser.Scene, textureKey: string): void {
    const directions: ReadonlyArray<readonly [Direction, number]> = [
      ["down", 0],
      ["up", 4],
      ["left", 8],
      ["right", 12],
    ];
    for (const [dir, start] of directions) {
      const animKey = `${textureKey}-walk-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(textureKey, {
            start,
            end: start + 3,
          }),
          frameRate: ANIM_FRAME_RATE,
          repeat: -1,
        });
      }
    }
    this.hasAnimations = true;
  }

  private updateAnimation(): void {
    if (!this.hasAnimations) return;

    const vx = this.sprite.body?.velocity.x ?? 0;
    const vy = this.sprite.body?.velocity.y ?? 0;
    const moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;

    if (moving) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? "right" : "left";
      } else {
        this.facing = vy > 0 ? "down" : "up";
      }
      const animKey = `${this.sprite.texture.key}-walk-${this.facing}`;
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.anims.play(animKey, true);
      }
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(IDLE_FRAMES[this.facing]);
    }
  }

  private patrol(delta: number): void {
    this.patrolTimer -= delta;

    if (this.patrolTimer <= 0) {
      if (this.aiState === "idle") {
        this.aiState = "patrol";
        const angle = Math.random() * Math.PI * 2;
        this.patrolDirection = { x: Math.cos(angle), y: Math.sin(angle) };
        this.patrolTimer = 800 + Math.random() * 1200;
      } else {
        this.aiState = "idle";
        this.sprite.setVelocity(0, 0);
        this.patrolPause =
          PATROL_PAUSE_MIN +
          Math.random() * (PATROL_PAUSE_MAX - PATROL_PAUSE_MIN);
        this.patrolTimer = this.patrolPause;
      }
    }

    if (this.aiState === "patrol") {
      const speed = this.definition.speed * 0.4;
      this.sprite.setVelocity(
        this.patrolDirection.x * speed,
        this.patrolDirection.y * speed,
      );
    }
  }
}
