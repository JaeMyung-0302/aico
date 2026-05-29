// Mirror of the action union from imoogi-boss.ts (sibling branch). When
// both branches land on main, this can be swapped to a re-export. Until
// then, declare locally to keep check-types green on feature branches.
export type ImoogiActionId =
  | "idle"
  | "melee"
  | "breath"
  | "tail_sweep"
  | "enrage_roar";

export interface ResolveContext {
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly playerDefense: number;
  readonly bossHp: number;
  readonly bossMaxHp: number;
  readonly bossAttack: number;
  readonly playerDistance: number;
}

export interface ResolvedAction {
  readonly damageToPlayer: number;
  readonly bossHpDelta: number;
  readonly effects: ReadonlyArray<string>;
}

export const MIN_DAMAGE = 1;
export const MELEE_RANGE_RESOLVER = 160;
export const BREATH_RANGE_MIN_RESOLVER = 300;
export const TAIL_SWEEP_RADIUS = 300;
export const BREATH_DAMAGE_MULTIPLIER = 1.4;
export const TAIL_SWEEP_DAMAGE_MULTIPLIER = 1.15;

const baseDamage = (ctx: ResolveContext): number =>
  Math.max(MIN_DAMAGE, ctx.bossAttack - ctx.playerDefense);

const miss = (): ResolvedAction => ({
  damageToPlayer: 0,
  bossHpDelta: 0,
  effects: ["missed"],
});

const hit = (
  damage: number,
  effects: ReadonlyArray<string> = [],
): ResolvedAction => ({
  damageToPlayer: damage,
  bossHpDelta: 0,
  effects,
});

const resolveMelee = (ctx: ResolveContext): ResolvedAction =>
  ctx.playerDistance <= MELEE_RANGE_RESOLVER ? hit(baseDamage(ctx)) : miss();

const resolveBreath = (ctx: ResolveContext): ResolvedAction =>
  ctx.playerDistance >= BREATH_RANGE_MIN_RESOLVER
    ? hit(
        Math.max(
          MIN_DAMAGE,
          Math.round(baseDamage(ctx) * BREATH_DAMAGE_MULTIPLIER),
        ),
      )
    : miss();

const resolveTailSweep = (ctx: ResolveContext): ResolvedAction =>
  ctx.playerDistance <= TAIL_SWEEP_RADIUS
    ? hit(
        Math.max(
          MIN_DAMAGE,
          Math.round(baseDamage(ctx) * TAIL_SWEEP_DAMAGE_MULTIPLIER),
        ),
      )
    : miss();

const resolveEnrageRoar = (): ResolvedAction => ({
  damageToPlayer: 0,
  bossHpDelta: 0,
  effects: ["stun"],
});

const resolveIdle = (): ResolvedAction => ({
  damageToPlayer: 0,
  bossHpDelta: 0,
  effects: [],
});

const resolveUnknown = (): ResolvedAction => ({
  damageToPlayer: 0,
  bossHpDelta: 0,
  effects: [],
});

export const resolveImoogiAction = (
  action: ImoogiActionId,
  ctx: ResolveContext,
): ResolvedAction => {
  switch (action) {
    case "idle":
      return resolveIdle();
    case "melee":
      return resolveMelee(ctx);
    case "breath":
      return resolveBreath(ctx);
    case "tail_sweep":
      return resolveTailSweep(ctx);
    case "enrage_roar":
      return resolveEnrageRoar();
    default:
      return resolveUnknown();
  }
};
