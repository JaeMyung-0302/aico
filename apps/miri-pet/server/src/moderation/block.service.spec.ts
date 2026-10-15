import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { runWithRequestContext } from '../common/request-context/request-context'
import { PrismaService } from '../prisma/prisma.service'
import { BlockService } from './block.service'

const A = '0199e3a0-0000-7000-8000-00000000000a'
const B = '0199e3a0-0000-7000-8000-00000000000b'
const C = '0199e3a0-0000-7000-8000-00000000000c'

describe('BlockService', () => {
  let prisma: FakePrisma
  let service: BlockService

  beforeEach(async () => {
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        BlockService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: new ConfigService({ r2: { publicBaseUrl: 'https://img.test' } }) },
      ],
    }).compile()
    service = moduleRef.get(BlockService)
  })

  describe('hiddenUserIds', () => {
    it('내가 차단한 사람과 나를 차단한 사람을 모두 돌려준다(양방향)', async () => {
      prisma.block.findMany.mockResolvedValue([
        { blockerId: A, blockedId: B },
        { blockerId: C, blockedId: A },
      ])
      const hidden = await service.hiddenUserIds(A)
      expect([...hidden].sort()).toEqual([B, C].sort())
      expect(prisma.block.findMany).toHaveBeenCalledWith({
        where: { OR: [{ blockerId: A }, { blockedId: A }] },
        select: { blockerId: true, blockedId: true },
      })
    })

    it('같은 요청 안에서는 한 번만 조회한다(요청 단위 메모이즈)', async () => {
      prisma.block.findMany.mockResolvedValue([])
      await runWithRequestContext(async () => {
        await service.hiddenUserIds(A)
        await service.hiddenUserIds(A)
      })
      expect(prisma.block.findMany).toHaveBeenCalledTimes(1)
    })

    it('요청이 다르면 다시 조회한다', async () => {
      prisma.block.findMany.mockResolvedValue([])
      await runWithRequestContext(() => service.hiddenUserIds(A))
      await runWithRequestContext(() => service.hiddenUserIds(A))
      expect(prisma.block.findMany).toHaveBeenCalledTimes(2)
    })

    it('isBlockedEitherWay는 양방향 관계를 판정한다', async () => {
      prisma.block.findMany.mockResolvedValue([{ blockerId: B, blockedId: A }])
      await expect(service.isBlockedEitherWay(A, B)).resolves.toBe(true)
      await expect(service.isBlockedEitherWay(A, C)).resolves.toBe(false)
    })
  })

  describe('block', () => {
    it('자기 자신은 차단할 수 없다(400)', async () => {
      await expect(service.block(A, A)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('ACTIVE이고 숨겨지지 않은 사용자가 아니면(없음·탈퇴·정지·신고 숨김) /users/:id와 같은 404', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      const error: unknown = await service.block(A, B).catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(NotFoundException)
      expect(error instanceof NotFoundException && error.message).toBe('사용자를 찾을 수 없어요')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: B, status: 'ACTIVE', hiddenAt: null },
        select: { id: true },
      })
      expect(prisma.block.createMany).not.toHaveBeenCalled()
    })

    it('차단은 멱등이고, 같은 요청의 메모를 무효화한다', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: B })
      prisma.block.createMany.mockResolvedValue({ count: 1 })
      prisma.block.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ blockerId: A, blockedId: B }])

      await runWithRequestContext(async () => {
        expect((await service.hiddenUserIds(A)).has(B)).toBe(false)
        await service.block(A, B)
        expect((await service.hiddenUserIds(A)).has(B)).toBe(true)
      })
      expect(prisma.block.createMany).toHaveBeenCalledWith({
        data: [{ blockerId: A, blockedId: B }],
        skipDuplicates: true,
      })
    })

    it('차단하면 서로의 팔로우 관계를 같은 트랜잭션에서 해제한다', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: B })
      prisma.block.createMany.mockResolvedValue({ count: 1 })
      prisma.follow.deleteMany.mockResolvedValue({ count: 2 })
      await service.block(A, B)
      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { followerId: A, followeeId: B },
            { followerId: B, followeeId: A },
          ],
        },
      })
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  it('unblock은 내 차단만 지운다(없어도 에러 없음)', async () => {
    prisma.block.deleteMany.mockResolvedValue({ count: 0 })
    await service.unblock(A, B)
    expect(prisma.block.deleteMany).toHaveBeenCalledWith({ where: { blockerId: A, blockedId: B } })
  })

  it('list는 내가 차단한 사용자를 UserSummary로 돌려준다(탈퇴자는 표기 대체)', async () => {
    prisma.block.findMany.mockResolvedValue([
      { blocked: { id: B, nickname: '보리맘', avatarMedia: { key: 'avatars/b.webp', status: 'READY' } } },
      { blocked: { id: C, nickname: null, avatarMedia: null } },
    ])
    await expect(service.list(A)).resolves.toEqual({
      items: [
        { id: B, nickname: '보리맘', avatarUrl: 'https://img.test/avatars/b.webp' },
        { id: C, nickname: '탈퇴한 사용자', avatarUrl: null },
      ],
    })
    expect(prisma.block.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { blockerId: A }, orderBy: { createdAt: 'desc' } }),
    )
  })
})
