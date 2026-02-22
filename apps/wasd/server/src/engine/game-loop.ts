import type { Server } from 'socket.io';
import type { GamePhase } from '@wasd/shared';
import {
  TICK_INTERVAL,
  STAGES,
  STAGE_OBSTACLES,
  SocketEvents,
  MAX_INPUT_QUEUE,
  GAME_LOOP_TTL_MS,
} from '@wasd/shared';
import { ServerGameState, type InputEntry } from './game-state.js';
import { applyMovement, keyToDirection } from './movement.js';
import {
  checkWallCollision,
  checkCoinCollection,
  checkGoalReached,
} from './collision.js';
import { DeathLogManager } from './death-log.js';
import { ObstacleManager } from './obstacle.js';
import { rankingStore } from './ranking-store.js';
import { roomManager } from '../rooms/room-manager.js';

const STAGE_CLEAR_DELAY = 2000;

export const gameLoops = new Map<string, GameLoop>();

export class GameLoop {
  private state: ServerGameState;
  private deathLog: DeathLogManager;
  private obstacleManager: ObstacleManager;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private ttlTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentTick = 0;
  private roomCode: string;
  private io: Server;
  private playerCount: number;

  constructor(roomCode: string, io: Server, playerCount = 1) {
    this.roomCode = roomCode;
    this.io = io;
    this.playerCount = playerCount;
    const startStage = 1;
    this.state = new ServerGameState(startStage);
    this.deathLog = new DeathLogManager();
    this.obstacleManager = new ObstacleManager(
      STAGE_OBSTACLES[startStage - 1] ?? []
    );
  }

  start(): void {
    this.intervalId = setInterval(() => this.update(), TICK_INTERVAL);
    this.ttlTimeoutId = setTimeout(() => {
      console.warn(`Game loop TTL expired: ${this.roomCode}`);
      this.io.to(this.roomCode).emit(SocketEvents.GAME_COMPLETE, {
        deaths: this.state.deaths,
        elapsedTime: GAME_LOOP_TTL_MS,
        ranking: rankingStore.getRankings(),
        myRank: null,
      });
      this.stop();
      gameLoops.delete(this.roomCode);
    }, GAME_LOOP_TTL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.ttlTimeoutId) {
      clearTimeout(this.ttlTimeoutId);
      this.ttlTimeoutId = null;
    }
  }

  queueInput(entry: InputEntry): void {
    if (this.state.pendingInputs.length >= MAX_INPUT_QUEUE) return;
    this.state.pendingInputs.push(entry);
  }

  private update(): void {
    if (this.state.phase !== 'playing') return;

    this.currentTick++;
    this.obstacleManager.update();
    this.state.obstacles = this.obstacleManager.getObstacles();

    if (this.obstacleManager.checkCollision(this.state.position)) {
      this.handleDeath('obstacle');
      return;
    }

    // 입력 처리: 방향 변경 + 이동 시작
    const inputs = [...this.state.pendingInputs];
    this.state.pendingInputs = [];

    for (const input of inputs) {
      const direction = keyToDirection(input.key);
      this.state.direction = direction;
      this.state.moving = true;

      this.deathLog.record({
        tick: this.currentTick,
        key: input.key,
        playerId: input.playerId,
        nickname: input.nickname,
        direction,
      });
    }

    // 이동 중이 아니면 브로드캐스트만
    if (!this.state.moving) {
      this.broadcast();
      return;
    }

    // 현재 방향으로 자동 이동
    const nextPosition = applyMovement(
      this.state.position,
      this.state.direction
    );

    if (
      checkWallCollision(nextPosition, this.state.tileMap) ||
      this.obstacleManager.checkCollision(nextPosition)
    ) {
      this.handleDeath();
      return;
    }

    this.state.position = nextPosition;

    if (this.obstacleManager.checkCollision(this.state.position)) {
      this.handleDeath('obstacle');
      return;
    }

    const collected = checkCoinCollection(
      nextPosition,
      this.state.tileMap,
      this.state.collectedCoins
    );
    for (const key of collected) {
      this.state.collectedCoins.add(key);
      this.state.coins++;
    }

    if (
      this.state.coins >= this.state.totalCoins &&
      checkGoalReached(nextPosition, this.state.tileMap)
    ) {
      this.handleStageClear();
      return;
    }

    this.broadcast();
  }

  private handleDeath(cause: 'input' | 'obstacle' = 'input'): void {
    this.state.deaths++;
    this.state.resetPosition();

    const culprit = cause === 'input' ? this.deathLog.getCulprit() : null;
    this.io.to(this.roomCode).emit(SocketEvents.DEATH, {
      deaths: this.state.deaths,
      log: this.deathLog.getLog(),
      culpritId: culprit?.playerId ?? '',
      culpritNickname:
        cause === 'obstacle' ? '장애물' : (culprit?.nickname ?? ''),
    });

    this.deathLog.clear();
    this.broadcast();
  }

  private handleStageClear(): void {
    const nextStage = this.state.stage + 1;

    if (nextStage > STAGES.length) {
      this.state.phase = 'complete' as GamePhase;
      const clearedAt = Date.now();
      const elapsedTime = clearedAt - this.state.startTime;
      const room = roomManager.getRoom(this.roomCode);
      const nicknames = room?.players.map((p) => p.nickname) ?? [];
      const entry = {
        nicknames,
        elapsedTime,
        deaths: this.state.deaths,
        playerCount: this.playerCount,
        clearedAt,
      };
      const myRank = rankingStore.addEntry(entry);
      this.io.to(this.roomCode).emit(SocketEvents.GAME_COMPLETE, {
        deaths: this.state.deaths,
        elapsedTime,
        ranking: rankingStore.getRankings(),
        myRank,
      });
      this.stop();
      gameLoops.delete(this.roomCode);
      return;
    }

    this.state.phase = 'stage-clear' as GamePhase;
    this.io.to(this.roomCode).emit(SocketEvents.STAGE_CLEAR, {
      stage: this.state.stage,
      nextStage,
      deaths: this.state.deaths,
    });

    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.state = new ServerGameState(nextStage, this.state.deaths, this.state.startTime);
      this.obstacleManager = new ObstacleManager(
        STAGE_OBSTACLES[nextStage - 1] ?? []
      );
      this.deathLog.clear();
      this.currentTick = 0;
      this.broadcast();
    }, STAGE_CLEAR_DELAY);
  }

  private broadcast(): void {
    this.io
      .to(this.roomCode)
      .emit(SocketEvents.GAME_STATE, this.state.toGameState());
  }
}
