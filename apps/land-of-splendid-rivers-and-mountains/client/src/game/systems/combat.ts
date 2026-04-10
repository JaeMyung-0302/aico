import Phaser from "phaser";
import type {
  MonsterDefinition,
  WeaponDefinition,
} from "@land-of-splendid-rivers-and-mountains/shared";
import type { IGameSystem } from "./system-manager";
import { Monster } from "../entities/Monster";
import { ObjectPool } from "./object-pool";
import { eventBus } from "@/lib/event-bus";
import monstersData from "../data/monsters.json";
import weaponsData from "../data/weapons.json";

const monsterDefs = new Map<string, MonsterDefinition>(
  (monstersData as ReadonlyArray<MonsterDefinition>).map((m) => [m.id, m]),
);

const weaponDefs = new Map<string, WeaponDefinition>(
  (weaponsData as ReadonlyArray<WeaponDefinition>).map((w) => [w.id, w]),
);

export const getWeaponDef = (id: string): WeaponDefinition | undefined =>
  weaponDefs.get(id);
export const getMonsterDef = (id: string): MonsterDefinition | undefined =>
  monsterDefs.get(id);

const PLAYER_MAX_HP_BASE = 50;
const PLAYER_INVINCIBLE_MS = 800;
const HIT_FLASH_DURATION = 150;
const DEATH_FADE_MS = 500;

let nextMonsterId = 1;

export class CombatSystem implements IGameSystem {
  readonly id = "combat";

  private scene!: Phaser.Scene;
  private playerSprite: Phaser.Physics.Arcade.Sprite | null = null;

  private hp = PLAYER_MAX_HP_BASE;
  private maxHp = PLAYER_MAX_HP_BASE;
  private attack = 5;
  private defense = 2;

  private readonly monsters: Map<string, Monster> = new Map();
  private monsterPool: ObjectPool<Monster> | null = null;
  private equippedWeaponId: string = "weapon-fist";
  private attackCooldown = 0;
  private invincibleTimer = 0;

  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.monsterPool = new ObjectPool<Monster>(
      () => {
        const placeholder = monsterDefs.values().next().value!;
        return new Monster(scene, -999, -999, placeholder, "");
      },
      (m) => m.deactivate(),
      32,
    );
  }

  update(_scene: Phaser.Scene, _time: number, delta: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);

    if (!this.playerSprite) return;

    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    for (const [, monster] of this.monsters) {
      if (monster.isDead()) continue;
      monster.update(delta, px, py);

      if (monster.canAttack() && this.invincibleTimer <= 0) {
        this.playerTakeDamage(
          monster.definition.attack,
          monster.sprite.x,
          monster.sprite.y,
        );
        monster.markAttacked();
      }
    }
  }

  destroy(): void {
    for (const [, monster] of this.monsters) {
      monster.destroy();
    }
    this.monsters.clear();
    if (this.monsterPool) {
      while (this.monsterPool.size > 0) {
        this.monsterPool.acquire().destroy();
      }
      this.monsterPool = null;
    }
    this.playerSprite = null;
  }

  setPlayerSprite(sprite: Phaser.Physics.Arcade.Sprite): void {
    this.playerSprite = sprite;
  }

  spawnMonster(monsterId: string, x: number, y: number): Monster | null {
    const def = monsterDefs.get(monsterId);
    if (!def) return null;

    const instanceId = `monster-${nextMonsterId++}`;

    if (this.monsterPool) {
      const monster = this.monsterPool.acquire();
      monster.reset(x, y, def, instanceId);
      this.monsters.set(instanceId, monster);
      return monster;
    }

    const monster = new Monster(this.scene, x, y, def, instanceId);
    this.monsters.set(instanceId, monster);
    return monster;
  }

  performAttack(
    playerX: number,
    playerY: number,
    dirX: number,
    dirY: number,
  ): boolean {
    if (this.attackCooldown > 0) return false;

    const weapon = weaponDefs.get(this.equippedWeaponId);
    if (!weapon) return false;

    this.attackCooldown = weapon.cooldownMs;

    // Player attack visual feedback - swing flash
    if (this.playerSprite) {
      this.playerSprite.setTint(0xffffaa);
      this.scene.time.delayedCall(100, () => {
        if (this.playerSprite) this.playerSprite.clearTint();
      });

      // Attack slash effect
      const slashX = playerX + dirX * weapon.range * 0.6;
      const slashY = playerY + dirY * weapon.range * 0.6;
      const slash = this.scene.add.text(slashX, slashY, "⚔", {
        fontSize: "20px",
      });
      slash.setOrigin(0.5).setDepth(100);
      this.scene.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 1.5,
        duration: 200,
        onComplete: () => slash.destroy(),
      });
    }

    const totalDamage = this.attack + weapon.damage;
    const rangeSq = weapon.range * weapon.range;

    let hit = false;
    for (const [id, monster] of this.monsters) {
      if (monster.isDead()) continue;

      const dx = monster.sprite.x - playerX;
      const dy = monster.sprite.y - playerY;
      const distSq = dx * dx + dy * dy;

      if (distSq > rangeSq) continue;

      if (dirX !== 0 || dirY !== 0) {
        const dot = dx * dirX + dy * dirY;
        if (dot < 0) continue;
      }

      const defeated = monster.takeDamage(
        totalDamage,
        dx,
        dy,
        weapon.knockback,
      );
      eventBus.emit("combat:hit", { targetId: id, damage: totalDamage });

      // Damage number popup
      const dmgText = this.scene.add.text(
        monster.sprite.x,
        monster.sprite.y - 16,
        `-${totalDamage}`,
        {
          fontSize: "12px",
          color: "#ff4444",
          fontFamily: "monospace",
          fontStyle: "bold",
        },
      );
      dmgText.setOrigin(0.5).setDepth(200);
      this.scene.tweens.add({
        targets: dmgText,
        y: dmgText.y - 24,
        alpha: 0,
        duration: 600,
        onComplete: () => dmgText.destroy(),
      });

      if (defeated) {
        this.onMonsterDefeated(id, monster);
      }

      hit = true;
    }

    return hit;
  }

  equipWeapon(weaponId: string): void {
    if (weaponDefs.has(weaponId)) {
      this.equippedWeaponId = weaponId;
    }
  }

  getEquippedWeaponId(): string {
    return this.equippedWeaponId;
  }

  getEquippedWeaponEnergyCost(): number {
    const weapon = weaponDefs.get(this.equippedWeaponId);
    return weapon?.energyCost ?? 0;
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  getAttack(): number {
    return this.attack;
  }

  getDefense(): number {
    return this.defense;
  }

  setStats(hp: number, maxHp: number, attack: number, defense: number): void {
    this.hp = hp;
    this.maxHp = maxHp;
    this.attack = attack;
    this.defense = defense;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.emitPlayerHp();
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  getMonsters(): ReadonlyMap<string, Monster> {
    return this.monsters;
  }

  clearMonsters(): void {
    for (const [, monster] of this.monsters) {
      if (this.monsterPool) {
        this.monsterPool.release(monster);
      } else {
        monster.destroy();
      }
    }
    this.monsters.clear();
  }

  private playerTakeDamage(
    monsterAttack: number,
    fromX: number,
    fromY: number,
  ): void {
    if (!this.playerSprite) return;

    const damage = Math.max(1, monsterAttack - this.defense);
    this.hp = Math.max(0, this.hp - damage);
    this.invincibleTimer = PLAYER_INVINCIBLE_MS;

    // Player damage number popup
    const dmgPopup = this.scene.add.text(
      this.playerSprite.x,
      this.playerSprite.y - 20,
      `-${damage}`,
      {
        fontSize: "14px",
        color: "#ff6666",
        fontFamily: "monospace",
        fontStyle: "bold",
      },
    );
    dmgPopup.setOrigin(0.5).setDepth(200);
    this.scene.tweens.add({
      targets: dmgPopup,
      y: dmgPopup.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgPopup.destroy(),
    });

    this.playerSprite.setTint(0xff0000);
    this.scene.time.delayedCall(HIT_FLASH_DURATION, () => {
      if (this.playerSprite) this.playerSprite.clearTint();
    });

    if (this.playerSprite) {
      const dx = this.playerSprite.x - fromX;
      const dy = this.playerSprite.y - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        this.playerSprite.setVelocity((dx / dist) * 160, (dy / dist) * 160);
        this.scene.time.delayedCall(150, () => {
          if (this.playerSprite) this.playerSprite.setVelocity(0, 0);
        });
      }
    }

    eventBus.emit("combat:playerHit", { damage, currentHp: this.hp });

    if (this.hp <= 0) {
      this.onPlayerDied();
    }
  }

  private onPlayerDied(): void {
    eventBus.emit("combat:playerDied", undefined);

    if (this.playerSprite) {
      this.scene.tweens.add({
        targets: this.playerSprite,
        alpha: 0,
        duration: DEATH_FADE_MS,
        onComplete: () => {
          if (this.playerSprite) this.playerSprite.setAlpha(1);
        },
      });
    }

    this.hp = Math.floor(this.maxHp * 0.5);
    this.emitPlayerHp();
    eventBus.emit("energy:fainted", { goldPenaltyRate: 0.1 });
  }

  private onMonsterDefeated(instanceId: string, monster: Monster): void {
    const def = monster.definition;
    const drops: { itemId: string; quantity: number }[] = [];

    for (const drop of def.drops) {
      if (Math.random() <= drop.chance) {
        drops.push({ itemId: drop.itemId, quantity: 1 });
      }
    }

    eventBus.emit("combat:defeated", { monsterId: def.id, drops });

    this.scene.time.delayedCall(300, () => {
      if (this.monsterPool) {
        this.monsterPool.release(monster);
      } else {
        monster.destroy();
      }
      this.monsters.delete(instanceId);
    });
  }

  private emitPlayerHp(): void {
    eventBus.emit("combat:playerHit", { damage: 0, currentHp: this.hp });
  }
}
