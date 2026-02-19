import type { StageConfig } from '@soulblade/shared'

// 화염성: 상급 스테이지 (25분)
export const FLAME_CASTLE_CONFIG: StageConfig = {
  id: 'flame_castle',
  name: '화염성',
  description: '용암이 흐르는 고대의 화염 요새',
  duration: 1500,
  tilemap: 'flame-castle',
  unlockCondition: 'ice_cave',
  recommendedLevel: 20,
  waves: [
    {
      timeStart: 0,
      timeEnd: 300,
      monsterTypes: ['normal', 'fast', 'tank'],
      spawnRate: 0.8,
      maxConcurrent: 15,
      eliteChance: 0.1,
    },
    {
      timeStart: 300,
      timeEnd: 600,
      monsterTypes: ['fast', 'tank', 'ranged', 'swarm'],
      spawnRate: 1.2,
      maxConcurrent: 22,
      eliteChance: 0.15,
    },
    {
      timeStart: 600,
      timeEnd: 1200,
      monsterTypes: ['fast', 'tank', 'ranged', 'swarm'],
      spawnRate: 1.8,
      maxConcurrent: 28,
      eliteChance: 0.2,
    },
    {
      timeStart: 1200,
      timeEnd: 1500,
      monsterTypes: ['fast', 'tank', 'ranged', 'swarm'],
      spawnRate: 2.5,
      maxConcurrent: 30,
      eliteChance: 0.25,
    },
  ],
  boss: {
    type: 'flame_dragon',
    spawnTime: 1200, // 20분
    hp: 1200,
    atk: 45,
    phases: 4,
  },
  events: [
    { type: 'merchant', triggerTime: 420, duration: 30 },
    { type: 'miniboss_rush', triggerTime: 720, duration: 60 },
    { type: 'curse', triggerTime: 1020, duration: 60 },
  ],
}
