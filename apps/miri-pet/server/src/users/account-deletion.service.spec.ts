import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { MediaService } from '../media/media.service'
import { PrismaService } from '../prisma/prisma.service'
import { DmRealtime } from '../realtime/dm-realtime'
import { AccountDeletionService } from './account-deletion.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const POST_1 = '0199e3a0-0000-7000-8000-0000000000p1'
const POST_2 = '0199e3a0-0000-7000-8000-0000000000p2'
const CERT_MEDIA = { id: '0199e3a0-0000-7000-8000-0000000000m1', bucket: 'PRIVATE', key: 'c/u/m1.jpg', status: 'READY' }
const AVATAR_MEDIA = {
  id: '0199e3a0-0000-7000-8000-0000000000m2',
  bucket: 'PUBLIC',
  key: 'p/m2/1440.jpg',
  status: 'READY',
}
const OWNED_MEDIA = [
  {
    id: '0199e3a0-0000-7000-8000-0000000000m3',
    ownerId: USER_ID,
    bucket: 'PUBLIC',
    key: 'p/m3/1440.jpg',
    status: 'READY',
  },
  {
    id: '0199e3a0-0000-7000-8000-0000000000m4',
    ownerId: USER_ID,
    bucket: 'PRIVATE',
    key: 'incoming/m4',
    status: 'PENDING',
  },
]

describe('AccountDeletionService', () => {
  let prisma: FakePrisma
  let service: AccountDeletionService
  const kakao = { unlink: jest.fn() }
  const media = { purgeMedia: jest.fn(), purgeOwnedMedia: jest.fn() }
  const realtime = { disconnectUser: jest.fn() }

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        { provide: PrismaService, useValue: prisma },
        { provide: KakaoUnlinkClient, useValue: kakao },
        { provide: MediaService, useValue: media },
        { provide: DmRealtime, useValue: realtime },
      ],
    }).compile()
    service = moduleRef.get(AccountDeletionService)
    prisma.authAccount.findMany.mockResolvedValue([
      { provider: 'KAKAO', providerSub: 'kakao-1' },
      { provider: 'GOOGLE', providerSub: 'google-1' },
    ])
    prisma.like.findMany.mockResolvedValue([{ postId: POST_1 }, { postId: POST_2 }])
    kakao.unlink.mockResolvedValue(undefined)
    media.purgeMedia.mockResolvedValue(undefined)
    media.purgeOwnedMedia.mockResolvedValue(undefined)
    prisma.vaccinationCertificate.findMany.mockResolvedValue([{ media: CERT_MEDIA }])
    prisma.media.findMany.mockResolvedValue([AVATAR_MEDIA])
    prisma.comment.findMany.mockResolvedValue([])
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  it('Phase 4: 같은 트랜잭션에서 내 게시물·댓글·알림(받은 것·만든 것)을 지운다', async () => {
    await service.deleteAccount(USER_ID)

    expect(prisma.post.deleteMany).toHaveBeenCalledWith({ where: { authorId: USER_ID } })
    expect(prisma.comment.deleteMany).toHaveBeenCalledWith({ where: { authorId: USER_ID } })
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ userId: USER_ID }, { actorId: USER_ID }] },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('H1: 펫 미디어 외에 남은 내 소유 Media 전체(게시물·DM·프로필·PENDING)를 트랜잭션에서 지우고 R2는 커밋 뒤 지운다', async () => {
    prisma.media.findMany.mockImplementation(async ({ where }: { where: { ownerId?: string } }) =>
      where.ownerId === USER_ID ? OWNED_MEDIA : [AVATAR_MEDIA],
    )
    await service.deleteAccount(USER_ID)

    expect(prisma.media.findMany).toHaveBeenCalledWith({
      where: { ownerId: USER_ID },
      select: { id: true, ownerId: true, bucket: true, key: true, status: true },
    })
    expect(prisma.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: OWNED_MEDIA.map((m) => m.id) } } })
    expect(media.purgeOwnedMedia).toHaveBeenCalledWith(OWNED_MEDIA)
    const committedAt = Math.max(...prisma.user.update.mock.invocationCallOrder)
    expect(media.purgeOwnedMedia.mock.invocationCallOrder[0]).toBeGreaterThan(committedAt)
  })

  it('L5: 내 장소 제보는 행은 남기고 reporterId와 자유 입력 note를 지운다(soft delete라 FK SetNull이 안 걸림)', async () => {
    await service.deleteAccount(USER_ID)

    const call = prisma.$executeRaw.mock.calls.find(([sql]: [readonly string[]]) =>
      sql.join('?').includes('"PlaceReport"'),
    )
    expect(call).toBeDefined()
    const sql = call?.[0].join('?') ?? ''
    expect(sql).toContain('"reporterId" = NULL')
    expect(sql).toContain("payload - 'note'")
    expect(call?.slice(1)).toEqual([USER_ID])
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      Math.max(...prisma.user.update.mock.invocationCallOrder),
    )
  })

  it('한 트랜잭션에서 인증·세션·푸시·팔로우·좋아요를 지우고 식별정보를 null로 만든다', async () => {
    await service.deleteAccount(USER_ID)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [POST_1, POST_2] } },
      data: { likeCount: { decrement: 1 } },
    })
    expect(prisma.like.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ followerId: USER_ID }, { followeeId: USER_ID }] },
    })
    expect(prisma.block.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ blockerId: USER_ID }, { blockedId: USER_ID }] },
    })
    expect(prisma.report.updateMany).toHaveBeenCalledWith({
      where: { reporterId: USER_ID },
      data: { detail: null },
    })
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.authAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: USER_ID },
      data: { body: null, mediaId: null, senderId: null },
    })
    expect(prisma.conversationMember.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        status: 'DELETED',
        nickname: null,
        bio: null,
        avatarMediaId: null,
        birthYearVerifiedAt: null,
        deletedAt: expect.any(Date),
      },
    })
  })

  it('Phase 2: 펫(→접종·증명서 cascade)과 증명서·펫 사진 Media 행을 트랜잭션에서 지운다', async () => {
    await service.deleteAccount(USER_ID)

    expect(prisma.vaccinationCertificate.findMany).toHaveBeenCalledWith({
      where: { vaccination: { pet: { ownerId: USER_ID } } },
      select: { media: { select: { id: true, bucket: true, key: true, status: true } } },
    })
    expect(prisma.media.findMany).toHaveBeenCalledWith({
      where: { petAvatar: { is: { ownerId: USER_ID } } },
      select: { id: true, bucket: true, key: true, status: true },
    })
    expect(prisma.pet.deleteMany).toHaveBeenCalledWith({ where: { ownerId: USER_ID } })
    expect(prisma.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [CERT_MEDIA.id, AVATAR_MEDIA.id] } } })
  })

  it('LOW-1: 커밋 뒤 열린 DM 소켓을 끊는다', async () => {
    await service.deleteAccount(USER_ID)
    expect(realtime.disconnectUser).toHaveBeenCalledWith(USER_ID)
    const committedAt = Math.max(...prisma.user.update.mock.invocationCallOrder)
    expect(realtime.disconnectUser.mock.invocationCallOrder[0]).toBeGreaterThan(committedAt)
  })

  it('Phase 2: R2 객체 삭제는 커밋 뒤에 한다', async () => {
    await service.deleteAccount(USER_ID)
    expect(media.purgeMedia).toHaveBeenCalledWith([CERT_MEDIA, AVATAR_MEDIA])
    const committedAt = Math.max(...prisma.user.update.mock.invocationCallOrder)
    expect(media.purgeMedia.mock.invocationCallOrder[0]).toBeGreaterThan(committedAt)
  })

  it('Phase 2: 펫 미디어가 없으면 Media 삭제를 건너뛴다', async () => {
    prisma.vaccinationCertificate.findMany.mockResolvedValue([])
    prisma.media.findMany.mockResolvedValue([])
    await service.deleteAccount(USER_ID)
    expect(prisma.media.deleteMany).not.toHaveBeenCalled()
    expect(prisma.pet.deleteMany).toHaveBeenCalled()
  })

  it('좋아요가 없으면 likeCount 감소를 건너뛴다', async () => {
    prisma.like.findMany.mockResolvedValue([])
    await service.deleteAccount(USER_ID)
    expect(prisma.post.updateMany).not.toHaveBeenCalled()
  })

  it('카카오 계정이면 커밋 후 unlink를 1회 호출한다', async () => {
    kakao.unlink.mockResolvedValue(undefined)
    await service.deleteAccount(USER_ID)
    expect(kakao.unlink).toHaveBeenCalledTimes(1)
    expect(kakao.unlink).toHaveBeenCalledWith('kakao-1')
  })

  it('카카오 unlink가 실패해도 로그만 남기고 탈퇴는 완료한다', async () => {
    kakao.unlink.mockRejectedValue(new Error('kakao 500'))
    await expect(service.deleteAccount(USER_ID)).resolves.toBeUndefined()
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringMatching(`^\\[account-deletion\\] kakao unlink failed ${USER_ID}`),
    )
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it('카카오 계정이 없으면 unlink하지 않는다', async () => {
    prisma.authAccount.findMany.mockResolvedValue([{ provider: 'GOOGLE', providerSub: 'g' }])
    await service.deleteAccount(USER_ID)
    expect(kakao.unlink).not.toHaveBeenCalled()
  })
})
