import type { WaveData } from '@/types'

// 30웨이브 구성
// W5/10/15/20/25: 유물 선택 웨이브
// W10/20/30: 보스 웨이브
export const WAVES: WaveData[] = [
  // === W1~W5: 초반 (불 + 바람 중심) ===
  { wave: 1, enemies: [{ enemyId: 'fire-imp', count: 5 }], spawnInterval: 1500, goldReward: 5, isArtifactWave: false, isBossWave: false },
  { wave: 2, enemies: [{ enemyId: 'fire-imp', count: 6 }, { enemyId: 'wind-bat', count: 3 }], spawnInterval: 1400, goldReward: 6, isArtifactWave: false, isBossWave: false },
  { wave: 3, enemies: [{ enemyId: 'wind-bat', count: 8 }], spawnInterval: 1300, goldReward: 7, isArtifactWave: false, isBossWave: false },
  { wave: 4, enemies: [{ enemyId: 'fire-imp', count: 5 }, { enemyId: 'water-slime', count: 4 }], spawnInterval: 1200, goldReward: 8, isArtifactWave: false, isBossWave: false },
  { wave: 5, enemies: [{ enemyId: 'water-slime', count: 6 }, { enemyId: 'wind-bat', count: 5 }, { enemyId: 'fire-drake', count: 1 }], spawnInterval: 1100, goldReward: 12, isArtifactWave: true, isBossWave: false },

  // === W6~W10: 중반1 (전 속성 혼합, 보스1) ===
  { wave: 6, enemies: [{ enemyId: 'thunder-wolf', count: 6 }, { enemyId: 'earth-turtle', count: 3 }], spawnInterval: 1100, goldReward: 10, isArtifactWave: false, isBossWave: false },
  { wave: 7, enemies: [{ enemyId: 'fire-imp', count: 4 }, { enemyId: 'thunder-wolf', count: 5 }, { enemyId: 'water-slime', count: 3 }], spawnInterval: 1000, goldReward: 11, isArtifactWave: false, isBossWave: false },
  { wave: 8, enemies: [{ enemyId: 'earth-turtle', count: 5 }, { enemyId: 'wind-harpy', count: 2 }], spawnInterval: 1000, goldReward: 13, isArtifactWave: false, isBossWave: false },
  { wave: 9, enemies: [{ enemyId: 'fire-drake', count: 2 }, { enemyId: 'water-serpent', count: 1 }, { enemyId: 'thunder-wolf', count: 6 }], spawnInterval: 900, goldReward: 15, isArtifactWave: false, isBossWave: false },
  { wave: 10, enemies: [{ enemyId: 'fire-imp', count: 8 }, { enemyId: 'wind-bat', count: 5 }], spawnInterval: 800, goldReward: 30, isArtifactWave: true, isBossWave: true },

  // === W11~W15: 중반2 (엘리트 빈도 증가) ===
  { wave: 11, enemies: [{ enemyId: 'water-serpent', count: 2 }, { enemyId: 'water-slime', count: 8 }], spawnInterval: 900, goldReward: 14, isArtifactWave: false, isBossWave: false },
  { wave: 12, enemies: [{ enemyId: 'thunder-lion', count: 2 }, { enemyId: 'fire-imp', count: 6 }, { enemyId: 'earth-turtle', count: 4 }], spawnInterval: 850, goldReward: 16, isArtifactWave: false, isBossWave: false },
  { wave: 13, enemies: [{ enemyId: 'wind-harpy', count: 3 }, { enemyId: 'wind-bat', count: 8 }], spawnInterval: 800, goldReward: 17, isArtifactWave: false, isBossWave: false },
  { wave: 14, enemies: [{ enemyId: 'earth-golem-e', count: 2 }, { enemyId: 'thunder-wolf', count: 6 }, { enemyId: 'fire-drake', count: 2 }], spawnInterval: 800, goldReward: 19, isArtifactWave: false, isBossWave: false },
  { wave: 15, enemies: [{ enemyId: 'fire-drake', count: 3 }, { enemyId: 'water-serpent', count: 2 }, { enemyId: 'thunder-lion', count: 2 }], spawnInterval: 750, goldReward: 22, isArtifactWave: true, isBossWave: false },

  // === W16~W20: 후반1 (보스2) ===
  { wave: 16, enemies: [{ enemyId: 'earth-turtle', count: 8 }, { enemyId: 'earth-golem-e', count: 3 }], spawnInterval: 750, goldReward: 20, isArtifactWave: false, isBossWave: false },
  { wave: 17, enemies: [{ enemyId: 'wind-harpy', count: 4 }, { enemyId: 'thunder-lion', count: 3 }, { enemyId: 'fire-imp', count: 6 }], spawnInterval: 700, goldReward: 22, isArtifactWave: false, isBossWave: false },
  { wave: 18, enemies: [{ enemyId: 'water-serpent', count: 3 }, { enemyId: 'fire-drake', count: 3 }, { enemyId: 'earth-golem-e', count: 2 }], spawnInterval: 700, goldReward: 24, isArtifactWave: false, isBossWave: false },
  { wave: 19, enemies: [{ enemyId: 'thunder-lion', count: 4 }, { enemyId: 'wind-harpy', count: 3 }, { enemyId: 'water-slime', count: 10 }], spawnInterval: 650, goldReward: 26, isArtifactWave: false, isBossWave: false },
  { wave: 20, enemies: [{ enemyId: 'fire-drake', count: 4 }, { enemyId: 'earth-golem-e', count: 3 }], spawnInterval: 600, goldReward: 50, isArtifactWave: true, isBossWave: true },

  // === W21~W25: 후반2 (하드 모드) ===
  { wave: 21, enemies: [{ enemyId: 'fire-drake', count: 4 }, { enemyId: 'water-serpent', count: 4 }, { enemyId: 'wind-harpy', count: 4 }], spawnInterval: 600, goldReward: 28, isArtifactWave: false, isBossWave: false },
  { wave: 22, enemies: [{ enemyId: 'thunder-lion', count: 5 }, { enemyId: 'earth-golem-e', count: 4 }], spawnInterval: 550, goldReward: 30, isArtifactWave: false, isBossWave: false },
  { wave: 23, enemies: [{ enemyId: 'wind-harpy', count: 5 }, { enemyId: 'fire-drake', count: 5 }, { enemyId: 'thunder-wolf', count: 8 }], spawnInterval: 550, goldReward: 32, isArtifactWave: false, isBossWave: false },
  { wave: 24, enemies: [{ enemyId: 'earth-golem-e', count: 5 }, { enemyId: 'water-serpent', count: 4 }, { enemyId: 'thunder-lion', count: 4 }], spawnInterval: 500, goldReward: 35, isArtifactWave: false, isBossWave: false },
  { wave: 25, enemies: [{ enemyId: 'fire-drake', count: 5 }, { enemyId: 'wind-harpy', count: 5 }, { enemyId: 'earth-golem-e', count: 5 }], spawnInterval: 500, goldReward: 40, isArtifactWave: true, isBossWave: false },

  // === W26~W30: 최종 (보스3) ===
  { wave: 26, enemies: [{ enemyId: 'thunder-lion', count: 6 }, { enemyId: 'water-serpent', count: 5 }, { enemyId: 'fire-drake', count: 5 }], spawnInterval: 500, goldReward: 35, isArtifactWave: false, isBossWave: false },
  { wave: 27, enemies: [{ enemyId: 'earth-golem-e', count: 6 }, { enemyId: 'wind-harpy', count: 6 }, { enemyId: 'thunder-lion', count: 5 }], spawnInterval: 450, goldReward: 38, isArtifactWave: false, isBossWave: false },
  { wave: 28, enemies: [{ enemyId: 'fire-drake', count: 6 }, { enemyId: 'water-serpent', count: 6 }, { enemyId: 'earth-golem-e', count: 5 }], spawnInterval: 450, goldReward: 40, isArtifactWave: false, isBossWave: false },
  { wave: 29, enemies: [{ enemyId: 'thunder-lion', count: 6 }, { enemyId: 'wind-harpy', count: 6 }, { enemyId: 'fire-drake', count: 5 }, { enemyId: 'earth-golem-e', count: 4 }], spawnInterval: 400, goldReward: 45, isArtifactWave: false, isBossWave: false },
  { wave: 30, enemies: [{ enemyId: 'fire-drake', count: 5 }, { enemyId: 'water-serpent', count: 5 }, { enemyId: 'wind-harpy', count: 5 }], spawnInterval: 400, goldReward: 100, isArtifactWave: false, isBossWave: true },
]

// 보스 웨이브 매핑
export const BOSS_WAVES: Record<number, string> = {
  10: 'boss-inferno',
  20: 'boss-leviathan',
  30: 'boss-titan',
}

export const getWaveData = (wave: number): WaveData | undefined =>
  WAVES.find((w) => w.wave === wave)

export const TOTAL_WAVES = 30
