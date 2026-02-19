import type { StageConfig } from '@soulblade/shared'

// 뱀저숲: 초보자 스테이지 (15분)
export const SERPENT_FOREST_CONFIG: StageConfig = {
  id: 'serpent_forest',
  name: '뱀저숲',
  description: '독사와 정령이 서식하는 어두운 숲',
  duration: 900,
  tilemap: 'serpent-forest',
  unlockCondition: null,
  recommendedLevel: 1,
  waves: [
    {
      timeStart: 0,
      timeEnd: 180,
      monsterTypes: ['normal', 'swarm'],
      spawnRate: 0.5,
      maxConcurrent: 10,
      eliteChance: 0,
    },
    {
      timeStart: 180,
      timeEnd: 360,
      monsterTypes: ['normal', 'fast', 'swarm'],
      spawnRate: 0.8,
      maxConcurrent: 15,
      eliteChance: 0.05,
    },
    {
      timeStart: 360,
      timeEnd: 600,
      monsterTypes: ['normal', 'fast', 'tank'],
      spawnRate: 1.2,
      maxConcurrent: 20,
      eliteChance: 0.1,
    },
    {
      timeStart: 600,
      timeEnd: 900,
      monsterTypes: ['normal', 'fast', 'tank', 'ranged'],
      spawnRate: 1.5,
      maxConcurrent: 25,
      eliteChance: 0.15,
    },
  ],
  boss: {
    type: 'serpent_king',
    spawnTime: 600, // 10분
    hp: 500,
    atk: 20,
    phases: 2,
  },
  events: [
    { type: 'merchant', triggerTime: 420, duration: 30 },
  ],
}
