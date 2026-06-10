import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { eventBus } from "@/lib/event-bus";
import { t } from "@/i18n";
import {
  DEFAULT_PATH,
  advanceAlongPath,
  pathLength,
} from "@/game/systems/tower-defense-path";
import { selectTarget } from "@/game/systems/tower-defense-targeting";
import {
  TOWERS,
  TOWER_TYPES,
  calcWaveReward,
  canAffordTower,
  type TowerType,
} from "@/game/systems/tower-defense-towers";
import {
  WAVES,
  createWaveSpawnState,
  getWave,
  startWave,
  tickWaveSpawner,
  type EnemyType,
  type WaveSpawnState,
} from "@/game/systems/tower-defense-wave";

// 적 기본 스탯 (웨이브 모듈은 스폰 타이밍만 정의)
const ENEMY_STATS: Readonly<Record<EnemyType, { hp: number; speed: number }>> =
  {
    goblin: { hp: 30, speed: 70 },
    orc: { hp: 80, speed: 50 },
    wraith: { hp: 50, speed: 95 },
    imoogi_spawn: { hp: 140, speed: 60 },
    boss: { hp: 400, speed: 40 },
  };

// 타워 슬롯 고정 좌표 (DEFAULT_PATH 인근)
const TOWER_SLOTS = [
  { x: 150, y: 120 },
  { x: 330, y: 200 },
  { x: 200, y: 320 },
  { x: 420, y: 300 },
];

const TICK_MS = 100;
const MAX_ESCAPES = 3;

interface SimEnemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  dist: number;
  slowedUntil: number;
}

type Phase = "setup" | "running" | "won" | "lost";

const DefensePanel = ({ open }: { readonly open: boolean }) => {
  const { gold, currentScene } = useGameStore();
  const [phase, setPhase] = useState<Phase>("setup");
  const [slots, setSlots] = useState<(TowerType | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [waveIndex, setWaveIndex] = useState(0);
  const [enemies, setEnemies] = useState<SimEnemy[]>([]);
  const [kills, setKills] = useState(0);
  const [escapes, setEscapes] = useState(0);
  const simRef = useRef<{
    spawn: WaveSpawnState;
    enemies: SimEnemy[];
    cooldowns: number[];
    nextId: number;
    kills: number;
    escapes: number;
    waveIndex: number;
    now: number;
  } | null>(null);

  const totalPathLen = pathLength(DEFAULT_PATH);

  const buyTower = (slotIdx: number, type: TowerType) => {
    if (!canAffordTower(gold, type).ok) return;
    const def = TOWERS[type];
    eventBus.emit("gold:changed", {
      amount: -def.cost,
      total: gold - def.cost,
    });
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? type : s)));
  };

  const start = useCallback(() => {
    simRef.current = {
      spawn: startWave(createWaveSpawnState(), 0),
      enemies: [],
      cooldowns: [0, 0, 0, 0],
      nextId: 1,
      kills: 0,
      escapes: 0,
      waveIndex: 0,
      now: 0,
    };
    setWaveIndex(0);
    setKills(0);
    setEscapes(0);
    setPhase("running");
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      sim.now += TICK_MS;

      // 1) 스폰
      const wave = getWave(sim.waveIndex);
      if (wave) {
        const r = tickWaveSpawner(sim.spawn, wave, TICK_MS);
        sim.spawn = r.state;
        if (r.spawned) {
          const stats = ENEMY_STATS[r.spawned];
          sim.enemies.push({
            id: `e${sim.nextId++}`,
            type: r.spawned,
            hp: stats.hp,
            maxHp: stats.hp,
            dist: 0,
            slowedUntil: 0,
          });
        }
      }

      // 2) 적 전진
      for (const e of sim.enemies) {
        const speed =
          ENEMY_STATS[e.type].speed * (sim.now < e.slowedUntil ? 0.6 : 1);
        const adv = advanceAlongPath(
          DEFAULT_PATH,
          { distanceTraveled: e.dist, totalDistance: totalPathLen },
          (speed * TICK_MS) / 1000,
        );
        e.dist = adv.progress.distanceTraveled;
        if (adv.reachedEnd) {
          e.hp = 0;
          sim.escapes += 1;
        }
      }
      sim.enemies = sim.enemies.filter((e) => e.hp > 0);

      // 3) 타워 발사 (순수 targeting 모듈 사용)
      slots.forEach((type, i) => {
        if (!type) return;
        const def = TOWERS[type];
        sim.cooldowns[i] = (sim.cooldowns[i] ?? 0) - TICK_MS;
        if ((sim.cooldowns[i] ?? 0) > 0) return;
        const tdEnemies = sim.enemies.map((e) => {
          const pos = advanceAlongPath(
            DEFAULT_PATH,
            { distanceTraveled: e.dist, totalDistance: totalPathLen },
            0,
          ).position;
          return {
            id: e.id,
            position: pos,
            hp: e.hp,
            maxHp: e.maxHp,
            pathProgress: e.dist,
          };
        });
        const target = selectTarget(
          { position: TOWER_SLOTS[i]!, range: def.range },
          tdEnemies,
          "first",
        );
        if (!target) return;
        sim.cooldowns[i] = def.fireIntervalMs;
        const hit = sim.enemies.find((e) => e.id === target.id);
        if (!hit) return;
        hit.hp -= def.damage;
        if (def.specialEffect === "slow") {
          hit.slowedUntil = sim.now + 1500;
        }
        if (def.specialEffect === "splash") {
          for (const other of sim.enemies) {
            if (other.id !== hit.id && Math.abs(other.dist - hit.dist) < 40) {
              other.hp -= Math.floor(def.damage / 2);
            }
          }
        }
      });
      const before = sim.enemies.length;
      sim.enemies = sim.enemies.filter((e) => e.hp > 0);
      sim.kills += before - sim.enemies.length;

      // 4) 패배/웨이브 전환/승리
      if (sim.escapes >= MAX_ESCAPES) {
        setPhase("lost");
        setEscapes(sim.escapes);
        return;
      }
      const waveDone =
        wave &&
        sim.spawn.spawnedCount >= wave.enemies.length &&
        sim.enemies.length === 0;
      if (waveDone) {
        const reward = calcWaveReward({
          enemyCount: wave.enemies.length,
          isBossWave: wave.enemies.some((e) => e.type === "boss"),
        });
        const g = useGameStore.getState().gold;
        eventBus.emit("gold:changed", { amount: reward, total: g + reward });
        if (sim.waveIndex + 1 >= WAVES.length) {
          setPhase("won");
          setKills(sim.kills);
          return;
        }
        sim.waveIndex += 1;
        sim.spawn = startWave(sim.spawn, sim.waveIndex);
        setWaveIndex(sim.waveIndex);
      }

      setEnemies([...sim.enemies]);
      setKills(sim.kills);
      setEscapes(sim.escapes);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, slots, totalPathLen]);

  if (!open) return null;
  if (currentScene !== "VillageScene") {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>🛡️ {t("ui.defense.title")}</div>
        <div style={styles.empty}>{t("ui.defense.noVillage")}</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        🛡️ {t("ui.defense.title")}
        <span style={styles.goldBadge}>{gold.toLocaleString()}G</span>
      </div>
      <div style={styles.status}>
        {t("ui.defense.wave")} {waveIndex + 1}/{WAVES.length} · ⚔️ {kills} · 🏃{" "}
        {escapes}/{MAX_ESCAPES}
      </div>

      <div style={styles.slots}>
        {slots.map((type, i) => (
          <div key={i} style={styles.slot}>
            {type ? (
              <span style={styles.towerLabel}>
                {t(TOWERS[type].nameKey as never)}
              </span>
            ) : phase === "setup" ? (
              <select
                style={styles.select}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) buyTower(i, e.target.value as TowerType);
                }}
              >
                <option value="">{t("ui.defense.build")}</option>
                {TOWER_TYPES.map((tt) => (
                  <option key={tt} value={tt} disabled={gold < TOWERS[tt].cost}>
                    {t(TOWERS[tt].nameKey as never)} ({TOWERS[tt].cost}G)
                  </option>
                ))}
              </select>
            ) : (
              <span style={styles.towerLabel}>—</span>
            )}
          </div>
        ))}
      </div>

      {phase === "running" && (
        <div style={styles.enemyList}>
          {enemies.slice(0, 6).map((e) => (
            <div key={e.id} style={styles.enemyRow}>
              <span>{e.type}</span>
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.barHp,
                    width: `${(e.hp / e.maxHp) * 100}%`,
                  }}
                />
              </div>
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.barProgress,
                    width: `${(e.dist / totalPathLen) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === "setup" && (
        <button style={styles.startBtn} onClick={start}>
          {t("ui.defense.start")}
        </button>
      )}
      {phase === "won" && (
        <div style={styles.result}>🏆 {t("ui.defense.won")}</div>
      )}
      {phase === "lost" && (
        <div style={styles.result}>💀 {t("ui.defense.lost")}</div>
      )}
      {(phase === "won" || phase === "lost") && (
        <button style={styles.startBtn} onClick={() => setPhase("setup")}>
          {t("ui.defense.retry")}
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    top: 50,
    left: "50%",
    transform: "translateX(-50%)",
    width: 340,
    maxHeight: 480,
    background: "linear-gradient(135deg, #1a237e, #283593)",
    borderRadius: 12,
    padding: 12,
    zIndex: 250,
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#fff",
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 15,
  },
  goldBadge: {
    background: "rgba(255,215,0,0.2)",
    color: "#ffd700",
    padding: "2px 8px",
    borderRadius: 8,
    fontSize: 13,
  },
  status: { fontSize: 12, opacity: 0.9 },
  empty: { padding: 16, textAlign: "center", fontSize: 13, opacity: 0.8 },
  slots: { display: "flex", gap: 6 },
  slot: {
    flex: 1,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 6,
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  towerLabel: { fontSize: 11, textAlign: "center" },
  select: { width: "100%", fontSize: 11 },
  enemyList: { display: "flex", flexDirection: "column", gap: 4 },
  enemyRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 1fr",
    gap: 6,
    alignItems: "center",
    fontSize: 11,
  },
  barOuter: {
    height: 8,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barHp: { height: "100%", background: "#ef5350" },
  barProgress: { height: "100%", background: "#ffca28" },
  startBtn: {
    background: "#3949ab",
    color: "#fff",
    border: "1px solid #7986cb",
    borderRadius: 8,
    padding: "8px 0",
    cursor: "pointer",
    fontWeight: 700,
  },
  result: { textAlign: "center", fontSize: 15, fontWeight: 700 },
};

export default DefensePanel;
