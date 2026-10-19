import { type ArgumentMetadata, BadRequestException, type PipeTransform } from '@nestjs/common'

const CHECKED_TYPES: ReadonlySet<ArgumentMetadata['type']> = new Set(['body', 'query', 'param'])

// NUL이 든 첫 문자열의 경로. 없으면 null ('' = 값 자체)
const findNulPath = (value: unknown, path: readonly string[] = []): string[] | null => {
  if (typeof value === 'string') return value.includes('\u0000') ? [...path] : null
  if (typeof value !== 'object' || value === null) return null
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value)
  for (const [key, child] of entries) {
    const found = findNulPath(child, [...path, key])
    if (found) return found
  }
  return null
}

// QA1 P2: Postgres text는 NUL(\u0000)을 저장·비교하지 못해 500이 난다 → 모든 body·query·param에서 400으로 막는다
export class RejectNulPipe implements PipeTransform<unknown, unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!CHECKED_TYPES.has(metadata.type)) return value
    const found = findNulPath(value, metadata.data ? [metadata.data] : [])
    if (!found) return value
    throw new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      in: metadata.type,
      issues: [{ path: found.join('.'), message: '허용되지 않는 문자(NUL)가 들어 있어요' }],
    })
  }
}
