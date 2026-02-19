import type { WaveData, EnemyData } from '@/types'
import { WAVES, BOSS_WAVES, TOTAL_WAVES } from '@/game/data/waves'
import { getEnemyById, getWaveHpScale } from '@/game/data/enemies'

export interface SpawnEntry {
  enemy: EnemyData
  scaledHp: number
  spawnDelay: number // ms (누적)
}

// 웨이브 데이터 조회
export const getWave = (waveNumber: number): WaveData | undefined =>
  WAVES.find((w) => w.wave === waveNumber)

// 웨이브의 스폰 리스트 생성 (적 HP 스케일링 적용)
export const generateSpawnList = (waveNumber: number): SpawnEntry[] => {
  const waveData = getWave(waveNumber)
  if (!waveData) return []

  const hpScale = getWaveHpScale(waveNumber)
  const entries: SpawnEntry[] = []
  let delay = 0

  // 일반/엘리트 적 스폰
  for (const entry of waveData.enemies) {
    const enemy = getEnemyById(entry.enemyId)
    if (!enemy) continue

    for (let i = 0; i < entry.count; i++) {
      entries.push({
        enemy,
        scaledHp: Math.round(enemy.baseHp * hpScale),
        spawnDelay: delay,
      })
      delay += waveData.spawnInterval
    }
  }

  // 보스 웨이브면 마지막에 보스 스폰
  if (waveData.isBossWave) {
    const bossId = BOSS_WAVES[waveNumber]
    const boss = bossId ? getEnemyById(bossId) : undefined

    if (boss) {
      entries.push({
        enemy: boss,
        scaledHp: Math.round(boss.baseHp * hpScale),
        spawnDelay: delay + 1000, // 보스는 일반 적 스폰 후 1초 뒤
      })
    }
  }

  return entries
}

// 유물 선택 웨이브 여부
export const isArtifactWave = (waveNumber: number): boolean =>
  waveNumber % 5 === 0 && waveNumber <= 25

// 보스 웨이브 여부
export const isBossWave = (waveNumber: number): boolean =>
  waveNumber % 10 === 0

// 게임 클리어 여부
export const isGameClear = (waveNumber: number): boolean =>
  waveNumber > TOTAL_WAVES

// 웨이브 골드 보상 계산 (유물 보너스 적용)
export const calculateWaveGold = (
  waveNumber: number,
  goldBonusPercent: number = 0,
  currentGold: number = 0,
  interestRate: number = 0,
): number => {
  const waveData = getWave(waveNumber)
  if (!waveData) return 0

  const baseGold = waveData.goldReward
  const bonusGold = Math.round(baseGold * goldBonusPercent)
  const interestGold = Math.floor(currentGold * interestRate)

  return baseGold + bonusGold + interestGold
}

export { TOTAL_WAVES }
