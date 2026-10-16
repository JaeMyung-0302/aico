import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import { PlaceImportService } from '../../src/places/import/place-import.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const FIXTURE = resolve(__dirname, '../fixtures/places-import.fixture.json')
const DEV_SAMPLES = resolve(__dirname, '../../src/places/import/dev-sample-places.json')

describe('장소 import (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let importer: PlaceImportService

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)
    importer = app.get(PlaceImportService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  it('좌표 없음·형식 오류 행은 건너뛰고 건수를 돌려준다', async () => {
    const result = await importer.importFromFile(FIXTURE)
    expect(result).toEqual({ upserted: 3, skipped: { missingCoordinates: 1, invalid: 1 } })
    expect(await prisma.place.count()).toBe(3)
  })

  it('같은 fixture를 2번 import해도 행 수가 같다(source, sourceRef 멱등 upsert)', async () => {
    await importer.importFromFile(FIXTURE)
    const firstIds = (await prisma.place.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map((p) => p.id)
    await importer.importFromFile(FIXTURE)
    const secondIds = (await prisma.place.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map((p) => p.id)
    expect(secondIds).toEqual(firstIds)
  })

  it('재import 시 원본 변경은 반영하되 운영자가 바꾼 status(HIDDEN)는 유지한다', async () => {
    await importer.importFromFile(FIXTURE)
    await prisma.place.updateMany({ where: { sourceRef: 'fixture-001' }, data: { status: 'HIDDEN' } })
    const changed = JSON.parse(readFileSync(FIXTURE, 'utf8')).map((row: { sourceRef?: string; name: string }) =>
      row.sourceRef === 'fixture-001' ? { ...row, name: '이름이 바뀐 카페' } : row,
    )
    const file = join(mkdtempSync(join(tmpdir(), 'miripet-import-')), 'changed.json')
    writeFileSync(file, JSON.stringify(changed))

    await importer.importFromFile(file)

    const place = await prisma.place.findFirstOrThrow({ where: { source: 'PUBLIC_DATA', sourceRef: 'fixture-001' } })
    expect(place).toMatchObject({ name: '이름이 바뀐 카페', status: 'HIDDEN' })
    expect(place.verifiedAt).toEqual(new Date('2026-09-30T00:00:00.000Z'))
  })

  it('개발용 샘플 시드: 15곳 내외, 전부 USER 출처 + 이름에 [샘플] 표시', async () => {
    const result = await importer.importFromFile(DEV_SAMPLES, { allowDevSamples: true })
    expect(result.skipped).toEqual({ missingCoordinates: 0, invalid: 0 })
    const places = await prisma.place.findMany()
    expect(places.length).toBeGreaterThanOrEqual(12)
    expect(
      places.every((p) => p.source === 'USER' && p.name.startsWith('[샘플]') && p.sourceRef?.startsWith('dev-sample-')),
    ).toBe(true)
  })

  it('L6: --allow-dev-samples 없이는 개발 환경에서도 샘플을 거부한다', async () => {
    await expect(importer.importFromFile(DEV_SAMPLES)).rejects.toThrow('--allow-dev-samples')
    expect(await prisma.place.count()).toBe(0)
  })

  it('production에서는 플래그가 있어도 개발용 샘플(dev-sample-*)을 거부한다', async () => {
    const restore = withEnv({ NODE_ENV: 'production' })
    try {
      await expect(importer.importFromFile(DEV_SAMPLES, { allowDevSamples: true })).rejects.toThrow('샘플')
      expect(await prisma.place.count()).toBe(0)
    } finally {
      restore()
    }
  })
})
