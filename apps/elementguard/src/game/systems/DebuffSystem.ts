import type { ActiveDebuff, ActiveBuff, DebuffType } from '@/types'

const MAX_DEBUFFS = 50

let debuffIdCounter = 0

// 디버프 ID 생성
const generateDebuffId = (): string => {
  debuffIdCounter += 1
  return `debuff-${debuffIdCounter}`
}

// 디버프 추가 (같은 타입+타겟이면 갱신)
export const addDebuff = (
  debuffs: ActiveDebuff[],
  type: DebuffType,
  targetId: string,
  value: number,
  durationMs: number,
): ActiveDebuff[] => {
  // 같은 타입+타겟 기존 디버프 찾기 → 갱신
  const existingIdx = debuffs.findIndex(
    (d) => d.type === type && d.targetId === targetId,
  )
  if (existingIdx >= 0) {
    return debuffs.map((d, i) =>
      i === existingIdx
        ? { ...d, value: Math.max(d.value, value), remainingMs: durationMs, maxMs: durationMs }
        : d,
    )
  }

  // 최대 디버프 수 제한
  if (debuffs.length >= MAX_DEBUFFS) return debuffs

  return [
    ...debuffs,
    {
      id: generateDebuffId(),
      type,
      targetId,
      value,
      remainingMs: durationMs,
      maxMs: durationMs,
    },
  ]
}

// 만료된 디버프 제거 + 시간 차감
export const updateDebuffs = (
  debuffs: ActiveDebuff[],
  deltaMs: number,
): ActiveDebuff[] =>
  debuffs
    .map((d) => ({ ...d, remainingMs: d.remainingMs - deltaMs }))
    .filter((d) => d.remainingMs > 0)

// 특정 타겟의 디버프 모두 제거 (적 사망 시)
export const removeDebuffsForTarget = (
  debuffs: ActiveDebuff[],
  targetId: string,
): ActiveDebuff[] =>
  debuffs.filter((d) => d.targetId !== targetId)

// 적의 유효 속도 계산 (슬로우 적용)
export const getEffectiveSpeed = (
  baseSpeed: number,
  targetId: string,
  debuffs: ActiveDebuff[],
): number => {
  const slowDebuffs = debuffs.filter(
    (d) => d.type === 'slow' && d.targetId === targetId,
  )
  if (slowDebuffs.length === 0) return baseSpeed

  // 가장 강한 슬로우 적용 (중첩 X)
  const maxSlow = Math.max(...slowDebuffs.map((d) => d.value))
  return baseSpeed * (1 - maxSlow)
}

// 적이 스턴 상태인지 확인
export const isStunned = (
  targetId: string,
  debuffs: ActiveDebuff[],
): boolean =>
  debuffs.some((d) => d.type === 'stun' && d.targetId === targetId)

// 유닛이 무력화(disable) 상태인지 확인 (보스 능력 등)
export const isDisabled = (
  targetId: string,
  debuffs: ActiveDebuff[],
): boolean =>
  debuffs.some((d) => d.type === 'disable' && d.targetId === targetId)

// 적이 armor_break 상태인지 + 추가 피격 비율 반환
export const getArmorBreakValue = (
  targetId: string,
  debuffs: ActiveDebuff[],
): number => {
  const armorBreak = debuffs.find(
    (d) => d.type === 'armor_break' && d.targetId === targetId,
  )
  return armorBreak?.value ?? 0
}

// 적의 DoT(지속 데미지) 초당 피해량 반환
export const getDotDamage = (
  targetId: string,
  debuffs: ActiveDebuff[],
): number => {
  const dotDebuffs = debuffs.filter(
    (d) => d.type === 'dot' && d.targetId === targetId,
  )
  return dotDebuffs.reduce((sum, d) => sum + d.value, 0)
}

// === 버프 시스템 ===

// 버프 추가 (같은 source+target+type이면 갱신)
export const addBuff = (
  buffs: ActiveBuff[],
  buff: ActiveBuff,
): ActiveBuff[] => {
  const existingIdx = buffs.findIndex(
    (b) => b.sourceId === buff.sourceId && b.targetId === buff.targetId && b.type === buff.type,
  )
  if (existingIdx >= 0) {
    return buffs.map((b, i) => (i === existingIdx ? buff : b))
  }
  return [...buffs, buff]
}

// 버프 소스가 사라졌을 때 해당 소스의 버프 제거
export const removeBuffsFromSource = (
  buffs: ActiveBuff[],
  sourceId: string,
): ActiveBuff[] =>
  buffs.filter((b) => b.sourceId !== sourceId)

// 유닛의 유효 공격력 배율 (버프 적용)
export const getEffectiveAtkMultiplier = (
  targetId: string,
  buffs: ActiveBuff[],
): number => {
  const atkBuffs = buffs.filter(
    (b) => b.type === 'atk_boost' && b.targetId === targetId,
  )
  // 모든 공격력 버프 합산
  const totalBoost = atkBuffs.reduce((sum, b) => sum + b.value, 0)
  return 1 + totalBoost
}

// 유닛의 유효 사거리 추가 (버프 적용)
export const getEffectiveRangeBoost = (
  targetId: string,
  buffs: ActiveBuff[],
): number => {
  const rangeBuffs = buffs.filter(
    (b) => b.type === 'range_boost' && b.targetId === targetId,
  )
  // 가장 큰 사거리 버프 적용
  return rangeBuffs.length > 0
    ? Math.max(...rangeBuffs.map((b) => b.value))
    : 0
}
