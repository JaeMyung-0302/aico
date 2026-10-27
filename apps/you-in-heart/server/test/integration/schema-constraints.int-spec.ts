import { PrismaClient } from '../../src/generated/prisma'
import { createEntry, createPairedCouple, createUser, type PairedCouple } from './factories'
import { uniqueViolationCode } from './prisma-error-code'
import { truncateAll } from './truncate'

// 서비스 버그가 있어도 DB가 막아야 하는 테넌트 경계·중복 제약 (ADR-001, architecture §5.1)
describe('schema constraints', () => {
  const prisma = new PrismaClient()
  let coupleA: PairedCouple
  let coupleB: PairedCouple

  beforeEach(async () => {
    await truncateAll(prisma)
    coupleA = await createPairedCouple(prisma)
    coupleB = await createPairedCouple(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('커플 A의 사진이 커플 B의 일기를 참조하면 FK 위반', async () => {
    const entryB = await createEntry(prisma, coupleB.couple.id, coupleB.members[0].id)

    const code = await uniqueViolationCode(
      prisma.photo.create({
        data: {
          coupleId: coupleA.couple.id,
          entryId: entryB.id,
          uploaderId: coupleA.members[0].id,
          originalKey: 'c/a/p/x/o',
          originalBytes: 1,
          originalMime: 'image/jpeg',
        },
      }),
    )

    expect(code).toBe('P2003')
  })

  it('한 사용자는 커플 하나에만 속한다 (CoupleMember.userId 유니크)', async () => {
    const code = await uniqueViolationCode(
      prisma.coupleMember.create({
        data: { coupleId: coupleB.couple.id, userId: coupleA.members[0].id, slot: 1 },
      }),
    )

    expect(code).toBe('P2002')
  })

  it('slot은 1 또는 2만 허용 (CHECK)', async () => {
    const solo = await prisma.couple.create({ data: {} })
    const user = await createUser(prisma)

    await expect(prisma.coupleMember.create({ data: { coupleId: solo.id, userId: user.id, slot: 3 } })).rejects.toThrow(
      /CoupleMember_slot_chk/,
    )
  })

  it('같은 알림(kind, coupleId, refKey, dueOn)은 한 번만 기록', async () => {
    const data = {
      kind: 'ANNIVERSARY_D0' as const,
      coupleId: coupleA.couple.id,
      refKey: 'day-100',
      dueOn: new Date('2026-06-08'),
    }
    await prisma.notificationLog.create({ data })

    const code = await uniqueViolationCode(prisma.notificationLog.create({ data }))

    expect(code).toBe('P2002')
  })

  it('하루에 자동 생성 일기(AUTO_DAY)는 커플당 하나, 직접 쓴 일기는 제한 없음', async () => {
    const authorId = coupleA.members[0].id
    const happenedOn = new Date('2024-05-05')
    await createEntry(prisma, coupleA.couple.id, authorId, { kind: 'AUTO_DAY', happenedOn, body: '' })
    await createEntry(prisma, coupleA.couple.id, authorId, { kind: 'MANUAL', happenedOn })
    await createEntry(prisma, coupleA.couple.id, authorId, { kind: 'MANUAL', happenedOn })

    const code = await uniqueViolationCode(
      createEntry(prisma, coupleA.couple.id, authorId, { kind: 'AUTO_DAY', happenedOn, body: '' }),
    )

    expect(code).toBe('P2002')
  })

  it('커플 A의 일기에 커플 B의 장소를 넣으면 FK 위반', async () => {
    const placeB = await prisma.place.create({
      data: { coupleId: coupleB.couple.id, name: '서울숲', lat: 37.5444, lng: 127.0374 },
    })

    const code = await uniqueViolationCode(
      createEntry(prisma, coupleA.couple.id, coupleA.members[0].id, { placeId: placeB.id }),
    )

    expect(code).toBe('P2003')
  })

  it('스크린샷이 아닌 문구는 텍스트가, 스크린샷 문구는 이미지 키가 있어야 한다 (CHECK)', async () => {
    const coupleId = coupleA.couple.id

    await expect(prisma.quote.create({ data: { coupleId, source: 'SHARE' } })).rejects.toThrow(/Quote_content_chk/)
    await expect(prisma.quote.create({ data: { coupleId, source: 'SCREENSHOT' } })).rejects.toThrow(/Quote_content_chk/)
  })

  it('커플당 진행 중인 내보내기는 하나뿐, 끝난 작업은 여러 개 가능', async () => {
    const coupleId = coupleA.couple.id
    await prisma.exportJob.create({ data: { coupleId, status: 'READY' } })
    await prisma.exportJob.create({ data: { coupleId, status: 'READY' } })
    await prisma.exportJob.create({ data: { coupleId, status: 'PENDING' } })

    const code = await uniqueViolationCode(prisma.exportJob.create({ data: { coupleId, status: 'RUNNING' } }))

    expect(code).toBe('P2002')
  })
})
