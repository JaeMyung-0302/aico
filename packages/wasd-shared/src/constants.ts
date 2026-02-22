export const TICK_RATE = 30
export const TICK_INTERVAL = Math.round(1000 / TICK_RATE) // 33ms

export const TILE_SIZE = 32
export const PLAYER_SIZE = 16
export const PLAYER_SPEED = 120 // px/sec
export const PLAYER_SPEED_PER_TICK = PLAYER_SPEED / TICK_RATE // 4px/tick

export const MAP_COLS = 20
export const MAP_ROWS = 15
export const CANVAS_WIDTH = MAP_COLS * TILE_SIZE // 640
export const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE // 480

export const DEATH_LOG_TICKS = 15 // 0.5 seconds

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 4
export const INVITE_CODE_LENGTH = 6

// Ranking
export const MAX_RANKING_SIZE = 50

// Security limits
export const MAX_ROOMS = 100
export const MAX_INPUT_QUEUE = 30
export const GAME_LOOP_TTL_MS = 30 * 60 * 1000 // 30 minutes
export const MAX_CONNECTIONS_PER_IP = 5
export const RATE_LIMIT_WINDOW_MS = 1000
export const RATE_LIMIT_MAX_EVENTS = 20
