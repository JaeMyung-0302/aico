import { describe, it, expect } from "vitest";
import {
  WAVES,
  createWaveSpawnState,
  startWave,
  tickWaveSpawner,
  getWave,
  isWaveComplete,
  type WaveSpawnState,
  type WaveDefinition,
} from "../game/systems/tower-defense-wave";

describe("tower-defense-wave — WAVES table", () => {
  it("defines at least 5 waves in ascending wave numbers", () => {
    expect(WAVES.length).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < WAVES.length; i++) {
      expect(WAVES[i]!.waveNumber).toBe(i + 1);
    }
  });

  it("last wave is the boss wave", () => {
    expect(WAVES[WAVES.length - 1]!.isBossWave).toBe(true);
  });

  it("earlier waves are not boss waves", () => {
    for (let i = 0; i < WAVES.length - 1; i++) {
      expect(WAVES[i]!.isBossWave).toBe(false);
    }
  });

  it("difficulty scales: later waves have at least as many enemies as earlier ones", () => {
    for (let i = 1; i < WAVES.length; i++) {
      expect(WAVES[i]!.enemies.length).toBeGreaterThanOrEqual(
        WAVES[i - 1]!.enemies.length,
      );
    }
  });

  it("each wave has ordered non-negative delays", () => {
    for (const wave of WAVES) {
      let prev = -Infinity;
      for (const e of wave.enemies) {
        expect(e.delayMs).toBeGreaterThanOrEqual(0);
        expect(e.delayMs).toBeGreaterThanOrEqual(prev);
        prev = e.delayMs;
      }
    }
  });
});

describe("getWave", () => {
  it("returns the wave at index 0", () => {
    expect(getWave(0)).toEqual(WAVES[0]);
  });

  it("returns null for negative indices", () => {
    expect(getWave(-1)).toBeNull();
  });

  it("returns null for out-of-range indices", () => {
    expect(getWave(WAVES.length)).toBeNull();
    expect(getWave(9999)).toBeNull();
  });
});

describe("createWaveSpawnState", () => {
  it("returns an inactive state with zero counters", () => {
    const s = createWaveSpawnState();
    expect(s.currentWaveIndex).toBe(-1);
    expect(s.spawnedCount).toBe(0);
    expect(s.elapsedMs).toBe(0);
    expect(s.active).toBe(false);
  });

  it("returns a fresh object each call", () => {
    expect(createWaveSpawnState()).not.toBe(createWaveSpawnState());
  });
});

describe("startWave", () => {
  it("activates the given wave and resets counters", () => {
    const primed: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 3,
      elapsedMs: 500,
      active: false,
    };
    const next = startWave(primed, 2);
    expect(next.currentWaveIndex).toBe(2);
    expect(next.spawnedCount).toBe(0);
    expect(next.elapsedMs).toBe(0);
    expect(next.active).toBe(true);
  });

  it("does not mutate the input state", () => {
    const s = createWaveSpawnState();
    const snapshot = { ...s };
    startWave(s, 1);
    expect(s).toEqual(snapshot);
  });
});

describe("tickWaveSpawner — inactive state", () => {
  it("no-ops when state is inactive", () => {
    const s = createWaveSpawnState();
    const wave: WaveDefinition = WAVES[0]!;
    const result = tickWaveSpawner(s, wave, 1000);
    expect(result.spawned).toBeNull();
    expect(result.waveComplete).toBe(false);
    expect(result.state).toEqual(s);
  });
});

describe("tickWaveSpawner — active state", () => {
  const wave: WaveDefinition = {
    waveNumber: 1,
    enemies: [
      { type: "goblin", delayMs: 0 },
      { type: "goblin", delayMs: 500 },
      { type: "orc", delayMs: 1200 },
    ],
    rewardGold: 100,
    isBossWave: false,
  };

  it("spawns the first enemy immediately when its delay is 0", () => {
    const s0 = startWave(createWaveSpawnState(), 0);
    const r = tickWaveSpawner(s0, wave, 16);
    expect(r.spawned).toBe("goblin");
    expect(r.state.spawnedCount).toBe(1);
    expect(r.state.elapsedMs).toBe(16);
    expect(r.waveComplete).toBe(false);
  });

  it("does not spawn before the next enemy's delay elapses", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 1,
      elapsedMs: 16,
      active: true,
    };
    const r = tickWaveSpawner(state, wave, 100);
    expect(r.spawned).toBeNull();
    expect(r.state.spawnedCount).toBe(1);
    expect(r.state.elapsedMs).toBe(116);
  });

  it("spawns the second enemy exactly at its delay", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 1,
      elapsedMs: 450,
      active: true,
    };
    const r = tickWaveSpawner(state, wave, 50);
    expect(r.spawned).toBe("goblin");
    expect(r.state.spawnedCount).toBe(2);
    expect(r.state.elapsedMs).toBe(500);
  });

  it("spawns only one enemy per tick even if multiple delays elapsed", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 0,
      elapsedMs: 0,
      active: true,
    };
    const r = tickWaveSpawner(state, wave, 2000);
    expect(r.spawned).toBe("goblin"); // only the first
    expect(r.state.spawnedCount).toBe(1);
  });

  it("flags waveComplete and deactivates when final enemy spawns", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 2,
      elapsedMs: 1100,
      active: true,
    };
    const r = tickWaveSpawner(state, wave, 200);
    expect(r.spawned).toBe("orc");
    expect(r.state.spawnedCount).toBe(3);
    expect(r.waveComplete).toBe(true);
    expect(r.state.active).toBe(false);
  });

  it("stays complete/inactive after all enemies spawned", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 3,
      elapsedMs: 5000,
      active: false,
    };
    const r = tickWaveSpawner(state, wave, 100);
    expect(r.spawned).toBeNull();
    expect(r.waveComplete).toBe(false); // not re-reported once inactive
  });

  it("deltaMs=0 preserves state exactly except for no progress", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 1,
      elapsedMs: 250,
      active: true,
    };
    const r = tickWaveSpawner(state, wave, 0);
    expect(r.spawned).toBeNull();
    expect(r.state.elapsedMs).toBe(250);
    expect(r.state.spawnedCount).toBe(1);
  });
});

describe("isWaveComplete", () => {
  const wave: WaveDefinition = {
    waveNumber: 1,
    enemies: [
      { type: "goblin", delayMs: 0 },
      { type: "goblin", delayMs: 100 },
    ],
    rewardGold: 50,
    isBossWave: false,
  };

  it("returns false while enemies remain unspawned", () => {
    expect(
      isWaveComplete(
        {
          currentWaveIndex: 0,
          spawnedCount: 1,
          elapsedMs: 50,
          active: true,
        },
        wave,
      ),
    ).toBe(false);
  });

  it("returns true once spawnedCount meets enemy count", () => {
    expect(
      isWaveComplete(
        {
          currentWaveIndex: 0,
          spawnedCount: 2,
          elapsedMs: 100,
          active: false,
        },
        wave,
      ),
    ).toBe(true);
  });
});

describe("tickWaveSpawner — purity", () => {
  it("does not mutate input state", () => {
    const state: WaveSpawnState = {
      currentWaveIndex: 0,
      spawnedCount: 1,
      elapsedMs: 200,
      active: true,
    };
    const snapshot = { ...state };
    tickWaveSpawner(state, WAVES[0]!, 100);
    expect(state).toEqual(snapshot);
  });

  it("does not mutate input wave", () => {
    const wave: WaveDefinition = {
      waveNumber: 1,
      enemies: [{ type: "goblin", delayMs: 0 }],
      rewardGold: 10,
      isBossWave: false,
    };
    const original = structuredClone(wave);
    tickWaveSpawner(startWave(createWaveSpawnState(), 0), wave, 50);
    expect(wave).toEqual(original);
  });
});
