import type { INestApplication } from '@nestjs/common'
import { puzzleDayDate, puzzleEndsOn, toKstDate } from '@you-in-heart/shared'
import request from 'supertest'
import { toDbDate } from '../../src/common/dates/db-date'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry, createPhoto } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/puzzles'

describe('우리 퍼즐 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const http = () => request(app.getHttpServer())
  const today = () => toKstDate(new Date())
  const newCouple = () => createCoupleSession(app, prisma)

  // 그 날의 일기 + READY 사진(표시용·썸네일 키 포함)
  const readyPhoto = async (session: CoupleSession, happenedOn: string, takenAt: Date | null = null) => {
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id, {
      happenedOn: toDbDate(happenedOn),
    })
    const photo = await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        status: 'READY',
        takenAt,
        displayKey: `c/${session.couple.id}/p/${photo.id}/d.jpg`,
        thumbKey: `c/${session.couple.id}/p/${photo.id}/t.jpg`,
      },
    })
    return { entryId: entry.id, photoId: photo.id }
  }

  const start = (session: CoupleSession, body: object, who: 0 | 1 = 0) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const list = (session: CoupleSession) =>
    http()
      .get(API)
      .set(...bearer(session.tokens[1]))
      .expect(200)

  // 끝난 퍼즐은 시작일을 과거로 두고 DB에 바로 넣는다(서버는 항상 오늘 시작)
  const insertPuzzle = (session: CoupleSession, startsOn: string, pieceCount: number, backgroundPhotoId: string) =>
    prisma.puzzle.create({
      data: {
        coupleId: session.couple.id,
        createdById: session.members[0].id,
        backgroundPhotoId,
        startsOn: toDbDate(startsOn),
        endsOn: toDbDate(puzzleEndsOn(startsOn, pieceCount)),
        pieceCount,
      },
    })

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage()),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  it('퍼즐이 없으면 current는 null, 완성한 퍼즐도 없다', async () => {
    const session = await newCouple()
    expect((await list(session)).body).toEqual({ current: null, completed: [] })
  })

  it('새 퍼즐은 오늘(KST) 시작, 조각 수만큼 날짜, 퍼즐판 사진은 서명 URL', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')

    const created = await start(session, { backgroundPhotoId: background.photoId, pieceCount: 100 }, 1).expect(201)

    expect(created.body).toEqual({
      id: expect.any(String),
      startsOn: today(),
      endsOn: puzzleEndsOn(today(), 100),
      pieceCount: 100,
      filledCount: 0,
      status: 'ACTIVE',
      backgroundUrl: expect.stringContaining(`/p/${background.photoId}/d.jpg`),
      createdAt: expect.any(String),
      pieces: [],
    })
    const row = await prisma.puzzle.findUniqueOrThrow({ where: { id: created.body.id } })
    expect(row.createdById).toBe(session.members[1].id)
    expect((await list(session)).body).toEqual({ current: created.body, completed: [] })
  })

  it('조각 = 기간 안 날짜의 일기 첫 사진. 하루에 하나, 기간 밖·사진 없는 일기는 빠진다', async () => {
    const session = await newCouple()
    const startsOn = puzzleDayDate(today(), -3)
    const background = await readyPhoto(session, '2026-01-01')
    await insertPuzzle(session, startsOn, 10, background.photoId)

    const day0Later = await readyPhoto(session, startsOn, new Date('2026-01-02T10:00:00Z'))
    const day0Earlier = await readyPhoto(session, startsOn, new Date('2026-01-02T09:00:00Z'))
    const day2 = await readyPhoto(session, puzzleDayDate(startsOn, 2))
    await readyPhoto(session, puzzleDayDate(startsOn, -1)) // 시작 전날
    await createEntry(prisma, session.couple.id, session.members[0].id, {
      happenedOn: toDbDate(puzzleDayDate(startsOn, 1)),
    }) // 사진 없는 일기

    const { current } = (await list(session)).body
    expect(current.filledCount).toBe(2)
    expect(current.pieces).toEqual([
      {
        dayIndex: 0,
        date: startsOn,
        entryId: day0Earlier.entryId,
        thumbUrl: expect.stringContaining(`/p/${day0Earlier.photoId}/t.jpg`),
      },
      {
        dayIndex: 2,
        date: puzzleDayDate(startsOn, 2),
        entryId: day2.entryId,
        thumbUrl: expect.stringContaining(`/p/${day2.photoId}/t.jpg`),
      },
    ])
    expect(current.pieces.map((piece: { entryId: string }) => piece.entryId)).not.toContain(day0Later.entryId)
  })

  it('PENDING 사진 조각은 빠지고, 일기를 지우면 조각도 사라진다', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    const created = await start(session, { backgroundPhotoId: background.photoId, pieceCount: 30 }).expect(201)
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id, {
      happenedOn: toDbDate(today()),
    })
    await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id) // PENDING
    const piece = await readyPhoto(session, today())

    const detail = await http()
      .get(`${API}/${created.body.id}`)
      .set(...bearer(session.tokens[0]))
      .expect(200)
    expect(detail.body.pieces).toEqual([expect.objectContaining({ dayIndex: 0, entryId: piece.entryId })])

    await prisma.diaryEntry.delete({ where: { id: piece.entryId } })
    expect((await list(session)).body.current.pieces).toEqual([])
  })

  it('끝나는 날이 지난 퍼즐은 완성으로 보관되고, 새 퍼즐을 시작할 수 있다', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    const older = await insertPuzzle(session, '2025-01-01', 100, background.photoId)
    const newer = await insertPuzzle(session, '2025-06-01', 100, background.photoId)

    const before = (await list(session)).body
    expect(before.current).toBeNull()
    expect(before.completed.map((puzzle: { id: string }) => puzzle.id)).toEqual([newer.id, older.id])
    expect(before.completed[0]).toEqual(
      expect.objectContaining({ status: 'COMPLETED', endsOn: '2025-09-08', pieceCount: 100 }),
    )
    expect(before.completed[0]).not.toHaveProperty('pieces')

    await start(session, { backgroundPhotoId: background.photoId, pieceCount: 7 }).expect(201)
    expect((await list(session)).body.current.pieceCount).toBe(7)
  })

  it('맞추는 중인 퍼즐이 있으면 새로 시작할 수 없다(409)', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    await start(session, { backgroundPhotoId: background.photoId, pieceCount: 100 }).expect(201)
    const second = await start(session, { backgroundPhotoId: background.photoId, pieceCount: 365 }, 1).expect(409)
    expect(second.body.code).toBe('PUZZLE_ALREADY_ACTIVE')
    expect(await prisma.puzzle.count({ where: { coupleId: session.couple.id } })).toBe(1)
  })

  it('동시에 두 번 시작해도 하나만 만들어진다', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    const body = { backgroundPhotoId: background.photoId, pieceCount: 100 }
    const statuses = (await Promise.all([start(session, body, 0), start(session, body, 1)])).map((res) => res.status)
    expect(statuses.sort()).toEqual([201, 409])
    expect(await prisma.puzzle.count({ where: { coupleId: session.couple.id } })).toBe(1)
  })

  it('퍼즐판 사진은 우리 커플의 READY 사진만(남의 사진·PENDING = 404)', async () => {
    const session = await newCouple()
    const other = await newCouple()
    const theirs = await readyPhoto(other, '2026-01-01')
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
    const pending = await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)

    await start(session, { backgroundPhotoId: theirs.photoId, pieceCount: 100 }).expect(404)
    await start(session, { backgroundPhotoId: pending.id, pieceCount: 100 }).expect(404)
    expect(await prisma.puzzle.count()).toBe(0)
  })

  it.each([
    ['조각 수가 너무 적음', { pieceCount: 6 }],
    ['조각 수가 너무 많음', { pieceCount: 401 }],
    ['소수 조각 수', { pieceCount: 10.5 }],
    ['사진 id 형식 오류', { backgroundPhotoId: 'nope' }],
  ])('%s → 400', async (_name, override) => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    await start(session, { backgroundPhotoId: background.photoId, pieceCount: 100, ...override }).expect(400)
  })

  it('퍼즐판 사진이 지워져도 퍼즐은 남고 backgroundUrl만 null', async () => {
    const session = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    await start(session, { backgroundPhotoId: background.photoId, pieceCount: 100 }).expect(201)
    await prisma.diaryEntry.delete({ where: { id: background.entryId } })
    expect((await list(session)).body.current.backgroundUrl).toBeNull()
  })

  it('지우기는 두 멤버 모두, 남의 퍼즐·없는 퍼즐은 404', async () => {
    const session = await newCouple()
    const other = await newCouple()
    const background = await readyPhoto(session, '2026-01-01')
    const created = await start(session, { backgroundPhotoId: background.photoId, pieceCount: 100 }).expect(201)

    await http()
      .delete(`${API}/${created.body.id}`)
      .set(...bearer(other.tokens[0]))
      .expect(404)
    await http()
      .get(`${API}/${created.body.id}`)
      .set(...bearer(other.tokens[0]))
      .expect(404)
    await http()
      .delete(`${API}/${created.body.id}`)
      .set(...bearer(session.tokens[1]))
      .expect(204)
    expect((await list(session)).body).toEqual({ current: null, completed: [] })
  })
})
