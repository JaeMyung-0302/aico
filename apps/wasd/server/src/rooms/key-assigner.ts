import type { Key, KeyAssignment } from '@wasd/shared'

const ALL_KEYS: readonly Key[] = ['w', 'a', 's', 'd']

// 교차 대각선 조합: 각 플레이어가 안전 방향 최소 1개 보장
const DIAGONAL_SPLITS: readonly [readonly Key[], readonly Key[]][] = [
  [
    ['w', 'd'],
    ['a', 's'],
  ],
  [
    ['a', 's'],
    ['w', 'd'],
  ],
]

const shuffle = <T>(array: readonly T[]): T[] => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = result[i]
    const b = result[j]
    if (a !== undefined && b !== undefined) {
      result[i] = b
      result[j] = a
    }
  }
  return result
}

export const assignKeys = (playerIds: string[]): KeyAssignment[] => {
  const count = playerIds.length

  if (count === 4) {
    const shuffledKeys = shuffle(ALL_KEYS)
    return playerIds.map((playerId, i) => ({
      playerId,
      keys: [shuffledKeys[i]!],
    }))
  }

  if (count === 3) {
    const shuffledKeys = shuffle(ALL_KEYS)
    const shuffledPlayers = shuffle(playerIds)
    return [
      { playerId: shuffledPlayers[0]!, keys: [shuffledKeys[0]!] },
      { playerId: shuffledPlayers[1]!, keys: [shuffledKeys[1]!] },
      {
        playerId: shuffledPlayers[2]!,
        keys: [shuffledKeys[2]!, shuffledKeys[3]!],
      },
    ]
  }

  if (count === 2) {
    const splitIndex = Math.floor(Math.random() * DIAGONAL_SPLITS.length)
    const split = DIAGONAL_SPLITS[splitIndex]!
    return [
      { playerId: playerIds[0]!, keys: [...split[0]] },
      { playerId: playerIds[1]!, keys: [...split[1]] },
    ]
  }

  if (count === 1) {
    return [{ playerId: playerIds[0]!, keys: [...ALL_KEYS] }]
  }

  return []
}
