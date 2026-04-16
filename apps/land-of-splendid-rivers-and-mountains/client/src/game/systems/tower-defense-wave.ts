export type EnemyType = "goblin" | "orc" | "wraith" | "imoogi_spawn" | "boss";

export interface WaveEnemySpec {
  readonly type: EnemyType;
  readonly delayMs: number;
}

export interface WaveDefinition {
  readonly waveNumber: number;
  readonly enemies: ReadonlyArray<WaveEnemySpec>;
  readonly rewardGold: number;
  readonly isBossWave: boolean;
}

export interface WaveSpawnState {
  readonly currentWaveIndex: number;
  readonly spawnedCount: number;
  readonly elapsedMs: number;
  readonly active: boolean;
}

export interface WaveTickResult {
  readonly state: WaveSpawnState;
  readonly spawned: EnemyType | null;
  readonly waveComplete: boolean;
}

export const WAVES: ReadonlyArray<WaveDefinition> = [
  {
    waveNumber: 1,
    enemies: [
      { type: "goblin", delayMs: 0 },
      { type: "goblin", delayMs: 1500 },
      { type: "goblin", delayMs: 3000 },
    ],
    rewardGold: 100,
    isBossWave: false,
  },
  {
    waveNumber: 2,
    enemies: [
      { type: "goblin", delayMs: 0 },
      { type: "goblin", delayMs: 1000 },
      { type: "orc", delayMs: 2500 },
      { type: "goblin", delayMs: 4000 },
    ],
    rewardGold: 200,
    isBossWave: false,
  },
  {
    waveNumber: 3,
    enemies: [
      { type: "orc", delayMs: 0 },
      { type: "goblin", delayMs: 800 },
      { type: "orc", delayMs: 1800 },
      { type: "wraith", delayMs: 3000 },
      { type: "orc", delayMs: 4500 },
    ],
    rewardGold: 350,
    isBossWave: false,
  },
  {
    waveNumber: 4,
    enemies: [
      { type: "wraith", delayMs: 0 },
      { type: "orc", delayMs: 700 },
      { type: "orc", delayMs: 1400 },
      { type: "wraith", delayMs: 2500 },
      { type: "imoogi_spawn", delayMs: 3800 },
      { type: "wraith", delayMs: 5000 },
    ],
    rewardGold: 500,
    isBossWave: false,
  },
  {
    waveNumber: 5,
    enemies: [
      { type: "imoogi_spawn", delayMs: 0 },
      { type: "wraith", delayMs: 600 },
      { type: "wraith", delayMs: 1200 },
      { type: "imoogi_spawn", delayMs: 2200 },
      { type: "orc", delayMs: 3000 },
      { type: "wraith", delayMs: 4000 },
      { type: "boss", delayMs: 6000 },
    ],
    rewardGold: 1000,
    isBossWave: true,
  },
];

export const createWaveSpawnState = (): WaveSpawnState => ({
  currentWaveIndex: -1,
  spawnedCount: 0,
  elapsedMs: 0,
  active: false,
});

export const startWave = (
  _state: WaveSpawnState,
  waveIndex: number,
): WaveSpawnState => ({
  currentWaveIndex: waveIndex,
  spawnedCount: 0,
  elapsedMs: 0,
  active: true,
});

export const getWave = (index: number): WaveDefinition | null => {
  if (index < 0 || index >= WAVES.length) return null;
  return WAVES[index]!;
};

export const isWaveComplete = (
  state: WaveSpawnState,
  wave: WaveDefinition,
): boolean => state.spawnedCount >= wave.enemies.length;

export const tickWaveSpawner = (
  state: WaveSpawnState,
  wave: WaveDefinition,
  deltaMs: number,
): WaveTickResult => {
  if (!state.active) {
    return { state, spawned: null, waveComplete: false };
  }

  const nextElapsed = state.elapsedMs + deltaMs;
  const nextEnemy = wave.enemies[state.spawnedCount];

  if (!nextEnemy) {
    // Safety: already past end — mark complete, deactivate.
    return {
      state: { ...state, elapsedMs: nextElapsed, active: false },
      spawned: null,
      waveComplete: false,
    };
  }

  const shouldSpawn = nextElapsed >= nextEnemy.delayMs;
  if (!shouldSpawn) {
    return {
      state: { ...state, elapsedMs: nextElapsed },
      spawned: null,
      waveComplete: false,
    };
  }

  const newSpawnedCount = state.spawnedCount + 1;
  const complete = newSpawnedCount >= wave.enemies.length;
  return {
    state: {
      currentWaveIndex: state.currentWaveIndex,
      spawnedCount: newSpawnedCount,
      elapsedMs: nextElapsed,
      active: !complete,
    },
    spawned: nextEnemy.type,
    waveComplete: complete,
  };
};
