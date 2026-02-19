import type { StageConfig } from '@soulblade/shared'

// 얼음동굴: 중급 스테이지 (20분)
export const ICE_CAVE_CONFIG: StageConfig = {
  id: 'ice_cave',
  name: '얼음동굴',
  description: '빙결 위험이 도사리는 얼어붙은 동굴',
  duration: 1200,
  tilemap: 'ice-cave',
  unlockCondition: 'serpent_forest',
  recommendedLevel: 10,
  waves: [
    {
      timeStart: 0,
      timeEnd: 240,
      monsterTypes: ['normal', 'fast'],
      spawnRate: 0.6,
      maxConcurrent: 12,
      eliteChance: 0.05,
    },
    {
      timeStart: 240,
      timeEnd: 480,
      monsterTypes: ['normal', 'fast', 'tank', 'swarm'],
      spawnRate: 1.0,
      maxConcurrent: 18,
      eliteChance: 0.1,
    },
    {
      timeStart: 480,
      timeEnd: 900,
      monsterTypes: ['normal', 'fast', 'tank', 'ranged'],
      spawnRate: 1.5,
      maxConcurrent: 25,
      eliteChance: 0.15,
    },
    {
      timeStart: 900,
      timeEnd: 1200,
      monsterTypes: ['fast', 'tank', 'ranged', 'swarm'],
      spawnRate: 2.0,
      maxConcurrent: 30,
      eliteChance: 0.2,
    },
  ],
  boss: {
    type: 'ice_golem',
    spawnTime: 900, // 15분
    hp: 800,
    atk: 30,
    phases: 3,
  },
  events: [
    { type: 'merchant', triggerTime: 420, duration: 30 },
    { type: 'curse', triggerTime: 720, duration: 60 },
  ],
}
