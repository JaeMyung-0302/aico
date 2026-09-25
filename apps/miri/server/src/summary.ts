import { KIND_LABEL, KINDS, PART_LABEL, PARTS, type Entry, type Kind, type Part } from './domain.ts'

/**
 * 주간 요약. "알려주기" 루프의 첫 산출물이라 규칙으로만 만든다.
 * 숫자를 나열하지 않고 한 일과 빠진 부위만 말한다.
 */

export type WeeklySummary = {
  kindCounts: Record<Kind, number>
  partCounts: Record<Part, number>
  text: string
}

function countBy<T extends string>(keys: readonly T[], values: T[]): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>
  for (const value of values) counts[value] += 1
  return counts
}

export function summarizeWeek(logs: Entry[]): WeeklySummary {
  const kindCounts = countBy(KINDS, logs.map((log) => log.kind))
  const partCounts = countBy(
    PARTS,
    logs.flatMap((log) => log.parts),
  )
  return { kindCounts, partCounts, text: describeWeek(kindCounts, partCounts, logs.length) }
}

function describeWeek(
  kindCounts: Record<Kind, number>,
  partCounts: Record<Part, number>,
  total: number,
): string {
  if (total === 0) return '이번 주는 기록이 없었어요. 오늘부터 다시 시작해요'

  const kindLine = KINDS.filter((kind) => kindCounts[kind] > 0)
    .map((kind) => `${KIND_LABEL[kind]} ${kindCounts[kind]}번`)
    .join(', ')

  if (kindCounts.gym === 0) return `이번 주 ${kindLine}`

  const missed = PARTS.filter((part) => partCounts[part] === 0)
  const partLine =
    missed.length === 0
      ? '네 부위 다 챙겼어요'
      : `${missed.map((part) => PART_LABEL[part]).join(', ')}${missed.length === 1 ? '는' : '은'} 없었어요`
  return `이번 주 ${kindLine}. ${partLine}`
}
