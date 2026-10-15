import { readFile } from 'node:fs/promises'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { type PlaceImportRecord, type PlaceImportSkipped, parsePlaceImportFile } from './place-import-record'

const UPSERT_CHUNK_SIZE = 100
export const DEV_SAMPLE_REF_PREFIX = 'dev-sample-'

export type PlaceImportResult = { upserted: number; skipped: PlaceImportSkipped }

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

export type PlaceImportOptions = { allowDevSamples?: boolean }

// 개발용 가짜 장소가 운영 DB에 들어가면 실제 데이터처럼 노출된다
// → --allow-dev-samples 플래그가 있고 NODE_ENV !== 'production'일 때만 허용(실행 시점 env: 운영 CLI는 컨테이너 env로 실행)
const assertDevSamplesAllowed = (
  records: readonly PlaceImportRecord[],
  { allowDevSamples = false }: PlaceImportOptions,
): void => {
  if (!records.some((record) => record.sourceRef.startsWith(DEV_SAMPLE_REF_PREFIX))) return
  if (process.env.NODE_ENV === 'production') {
    throw new Error('production에서는 개발용 샘플(dev-sample-*) 장소를 import할 수 없습니다')
  }
  if (!allowDevSamples) {
    throw new Error('개발용 샘플(dev-sample-*)이 들어 있습니다. 의도한 것이면 --allow-dev-samples를 붙이세요')
  }
}

@Injectable()
export class PlaceImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromFile(path: string, options: PlaceImportOptions = {}): Promise<PlaceImportResult> {
    const { records, skipped } = parsePlaceImportFile(JSON.parse(await readFile(path, 'utf8')))
    assertDevSamplesAllowed(records, options)
    for (const batch of chunk(records, UPSERT_CHUNK_SIZE)) {
      await this.prisma.$transaction(batch.map((record) => this.upsert(record)))
    }
    return { upserted: records.length, skipped }
  }

  // (source, sourceRef) 멱등 upsert. status는 운영자 결정(숨김·폐업)이므로 재import로 덮지 않는다
  // TODO(Phase 3 후속): 승인된 사용자 수정 제보를 원본 재import가 덮어쓰지 않도록 필드별 우선순위 정하기
  private upsert(record: PlaceImportRecord) {
    const { source, sourceRef, ...fields } = record
    return this.prisma.place.upsert({
      where: { source_sourceRef: { source, sourceRef } },
      create: record,
      update: fields,
    })
  }
}
