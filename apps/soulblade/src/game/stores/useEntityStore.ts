/**
 * Zustand 엔티티 스토어
 * Phaser Group + Sprite 상태를 순수 데이터로 관리
 *
 * Phase 2: 몬스터/엘리트/투사체/보스 확장 완료
 */

import { create } from 'zustand'
import type {
  CharacterClass,
  BasicAttackPattern,
  CharacterStats,
} from '@soulblade/shared'
import { CLASS_CONFIGS, calcExpForLevel } from '@soulblade/shared'
import type { PlayerEntity, MonsterEntity, EliteEntity, ProjectileEntity, BossEntity } from '../types'

interface EntityState {
  player: PlayerEntity | null
  monsters: MonsterEntity[]
  elites: EliteEntity[]
  projectiles: ProjectileEntity[]
  boss: BossEntity | null

  // 플레이어 초기화
  initPlayer: (
    x: number,
    y: number,
    classType: CharacterClass,
    permanentStats?: Partial<CharacterStats>,
    characterName?: string,
  ) => void

  // 플레이어 제거
  clearPlayer: () => void

  // 몬스터
  addMonster: (monster: MonsterEntity) => void
  addMonsters: (monsters: MonsterEntity[]) => void
  removeMonster: (id: string) => void

  // 엘리트
  addElite: (elite: EliteEntity) => void
  addElites: (elites: EliteEntity[]) => void
  removeElite: (id: string) => void

  // 투사체
  addProjectile: (projectile: ProjectileEntity) => void
  removeProjectile: (id: string) => void

  // 보스
  setBoss: (boss: BossEntity | null) => void

  // 전체 초기화
  clearAll: () => void
}

export const useEntityStore = create<EntityState>((set) => ({
  player: null,
  monsters: [],
  elites: [],
  projectiles: [],
  boss: null,

  initPlayer: (x, y, classType, permanentStats, characterName) => {
    const config = CLASS_CONFIGS[classType]
    const base = config.baseStats
    const perm = permanentStats ?? {}

    const hp = base.hp + (perm.hp ?? 0)

    const player: PlayerEntity = {
      id: 'player',
      active: true,
      body: {
        x,
        y,
        vx: 0,
        vy: 0,
        width: 32,
        height: 48,
        isStatic: false,
      },
      classType,
      attackPattern: config.basicAttackPattern as BasicAttackPattern,
      hp,
      maxHp: hp,
      atk: base.atk + (perm.atk ?? 0),
      def: base.def + (perm.def ?? 0),
      spd: base.spd + (perm.spd ?? 0),
      crit: base.crit + (perm.crit ?? 0),
      critDmg: base.critDmg + (perm.critDmg ?? 0),
      weaponPower: 0,
      level: 1,
      exp: 0,
      expToNext: calcExpForLevel(1),
      passiveSkills: new Map(),
      facingAngle: 0,
      holyShieldActive: false,
      holyShieldTimer: 0,
      holyShieldInterval: 0,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      characterName: characterName ?? '',
    }

    set({ player })
  },

  clearPlayer: () => set({ player: null }),

  addMonster: (monster) =>
    set((state) => ({ monsters: [...state.monsters, monster] })),

  addMonsters: (monsters) =>
    set((state) => ({ monsters: [...state.monsters, ...monsters] })),

  removeMonster: (id) =>
    set((state) => ({ monsters: state.monsters.filter((m) => m.id !== id) })),

  addElite: (elite) =>
    set((state) => ({ elites: [...state.elites, elite] })),

  addElites: (elites) =>
    set((state) => ({ elites: [...state.elites, ...elites] })),

  removeElite: (id) =>
    set((state) => ({ elites: state.elites.filter((e) => e.id !== id) })),

  addProjectile: (projectile) =>
    set((state) => ({ projectiles: [...state.projectiles, projectile] })),

  removeProjectile: (id) =>
    set((state) => ({ projectiles: state.projectiles.filter((p) => p.id !== id) })),

  setBoss: (boss) => set({ boss }),

  clearAll: () =>
    set({ player: null, monsters: [], elites: [], projectiles: [], boss: null }),
}))
