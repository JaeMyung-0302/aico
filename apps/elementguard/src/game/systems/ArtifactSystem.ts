import type { ArtifactData } from '@/types'
import { ARTIFACTS } from '@/game/data/artifacts'

// 유물 3개 랜덤 선택 (중복 불허)
export const pickArtifactChoices = (
  ownedArtifactIds: string[],
  count: number = 3,
): ArtifactData[] => {
  const available = ARTIFACTS.filter((a) => !ownedArtifactIds.includes(a.id))

  if (available.length <= count) return [...available]

  const picked: ArtifactData[] = []
  const pool = [...available]

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const item = pool[idx]
    if (item) picked.push(item)
    pool.splice(idx, 1)
  }

  return picked
}

// 유물 효과 적용 계산 (스냅샷)
export interface ArtifactBonuses {
  atkPercent: Record<string, number> // target → bonus (e.g., 'fire' → 0.25)
  atkSpeed: number
  critChance: number
  maxHpBonus: number
  hpRegen: number
  goldBonus: number
  summonDiscount: number
  enemySlow: number
  fusionChanceBonus: number
  expBoost: number
  terrainBoost: number
  hasRevive: boolean
  interestRate: number
  eliteBounty: number
  synergyBoost: number
  rainbowBonus: number
  duoBonus: number
  chainBonus: number
  summonLuck: number
  artifactReroll: number
  advantageBoost: number
}

// 보유 유물들의 보너스 합산
export const calculateArtifactBonuses = (artifactIds: string[]): ArtifactBonuses => {
  const bonuses: ArtifactBonuses = {
    atkPercent: {},
    atkSpeed: 0,
    critChance: 0,
    maxHpBonus: 0,
    hpRegen: 0,
    goldBonus: 0,
    summonDiscount: 0,
    enemySlow: 0,
    fusionChanceBonus: 0,
    expBoost: 0,
    terrainBoost: 0,
    hasRevive: false,
    interestRate: 0,
    eliteBounty: 0,
    synergyBoost: 0,
    rainbowBonus: 0,
    duoBonus: 0,
    chainBonus: 0,
    summonLuck: 0,
    artifactReroll: 0,
    advantageBoost: 0,
  }

  for (const id of artifactIds) {
    const artifact = ARTIFACTS.find((a) => a.id === id)
    if (!artifact) continue

    const { effect } = artifact

    switch (effect.type) {
      case 'atk_percent': {
        const target = effect.target ?? 'all'
        bonuses.atkPercent[target] = (bonuses.atkPercent[target] ?? 0) + effect.value
        break
      }
      case 'atk_speed':
        bonuses.atkSpeed += effect.value
        break
      case 'crit_chance':
        bonuses.critChance += effect.value
        break
      case 'atk_rage':
        bonuses.atkPercent['all'] = (bonuses.atkPercent['all'] ?? 0) + effect.value
        bonuses.atkSpeed += 0.1
        break
      case 'max_hp':
        bonuses.maxHpBonus += effect.value
        break
      case 'hp_regen':
        bonuses.hpRegen += effect.value
        break
      case 'thorns':
        break // 전투 시스템에서 직접 처리
      case 'enemy_slow':
        bonuses.enemySlow += effect.value
        break
      case 'fortress':
        bonuses.maxHpBonus += effect.value
        bonuses.hpRegen += 3
        break
      case 'gold_bonus':
        bonuses.goldBonus += effect.value
        break
      case 'summon_discount':
        bonuses.summonDiscount += effect.value
        break
      case 'interest':
        bonuses.interestRate += effect.value
        break
      case 'elite_bounty':
        bonuses.eliteBounty += effect.value
        break
      case 'midas':
        bonuses.summonDiscount += effect.value
        bonuses.goldBonus += 0.3
        break
      case 'fusion_chance':
        bonuses.fusionChanceBonus += effect.value
        break
      case 'summon_luck':
        bonuses.summonLuck += effect.value
        break
      case 'artifact_reroll':
        bonuses.artifactReroll += effect.value
        break
      case 'exp_boost':
        bonuses.expBoost += effect.value
        break
      case 'terrain_boost':
        bonuses.terrainBoost += effect.value
        break
      case 'revive':
        bonuses.hasRevive = true
        break
      case 'synergy_boost':
        bonuses.synergyBoost += effect.value
        break
      case 'rainbow_bonus':
        bonuses.rainbowBonus += effect.value
        break
      case 'duo_bonus':
        bonuses.duoBonus += effect.value
        break
      case 'chain_bonus':
        bonuses.chainBonus += effect.value
        break
      case 'advantage_boost':
        bonuses.advantageBoost += effect.value
        break
    }
  }

  return bonuses
}
