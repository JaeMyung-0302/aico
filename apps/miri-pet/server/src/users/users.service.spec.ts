import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { MediaService } from '../media/media.service'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'
import { UsersService } from './users.service'

const ME = '0199e3a0-0000-7000-8000-0000000000a1'
const OTHER = '0199e3a0-0000-7000-8000-0000000000b1'
const MEDIA = '0199e3a0-0000-7000-8000-0000000000m1'
const OLD_AVATAR = {
  id: '0199e3a0-0000-7000-8000-0000000000m0',
  bucket: 'PUBLIC',
  key: 'p/m0/1440.jpg',
  status: 'READY',
}

const meRow = {
  id: ME,
  nickname: '보리맘',
  bio: null,
  role: 'USER',
  notifyVaccination: true,
  notifySocial: false,
  notifyDm: true,
  avatarMedia: { key: 'avatars/me.webp', status: 'READY' },
}

describe('UsersService', () => {
  let prisma: FakePrisma
  let service: UsersService
  const consents = { hasRequiredConsents: jest.fn() }
  const blocks = { isBlockedEitherWay: jest.fn() }
  const media = { assertUsable: jest.fn(), discardIfUnused: jest.fn() }

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConsentService, useValue: consents },
        { provide: BlockService, useValue: blocks },
        { provide: MediaService, useValue: media },
        { provide: ConfigService, useValue: new ConfigService({ r2: { publicBaseUrl: 'https://img.test' } }) },
      ],
    }).compile()
    service = moduleRef.get(UsersService)
    consents.hasRequiredConsents.mockResolvedValue(true)
    blocks.isBlockedEitherWay.mockResolvedValue(false)
  })

  describe('getMe', () => {
    it('내 정보와 필수 동의 여부를 돌려준다', async () => {
      prisma.user.findUnique.mockResolvedValue(meRow)
      await expect(service.getMe(ME)).resolves.toEqual({
        id: ME,
        nickname: '보리맘',
        avatarUrl: 'https://img.test/avatars/me.webp',
        bio: null,
        role: 'USER',
        notifyVaccination: true,
        notifySocial: false,
        notifyDm: true,
        hasRequiredConsents: true,
      })
    })

    it('사용자가 없으면 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.getMe(ME)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('updateMe', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(meRow)
      prisma.user.update.mockResolvedValue({})
    })

    it('닉네임·소개·알림 토글을 갱신한다', async () => {
      await service.updateMe(ME, { nickname: '보리아빠', notifyDm: false, bio: '안녕' })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ME },
        data: { nickname: '보리아빠', notifyDm: false, bio: '안녕' },
      })
    })

    it('이미 쓰는 닉네임이면 409', async () => {
      prisma.user.update.mockRejectedValue(uniqueViolation('nickname'))
      await expect(service.updateMe(ME, { nickname: '중복' })).rejects.toBeInstanceOf(ConflictException)
    })

    it('유니크 위반 외 에러는 그대로 던진다', async () => {
      prisma.user.update.mockRejectedValue(new Error('db down'))
      await expect(service.updateMe(ME, { bio: 'x' })).rejects.toThrow('db down')
    })

    it('L4: 아바타는 MediaService.assertUsable(내 것 + READY + AVATAR)을 통과해야 한다(아니면 그 에러)', async () => {
      media.assertUsable.mockRejectedValue(new UnprocessableEntityException({ code: 'MEDIA_NOT_USABLE' }))
      await expect(service.updateMe(ME, { avatarMediaId: MEDIA })).rejects.toBeInstanceOf(UnprocessableEntityException)
      expect(media.assertUsable).toHaveBeenCalledWith(ME, [MEDIA], 'AVATAR')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('L4: 아바타 유니크 위반은 닉네임이 아니라 409 AVATAR_IN_USE', async () => {
      prisma.user.update.mockRejectedValue(uniqueViolation('avatarMediaId'))
      const error = await service.updateMe(ME, { avatarMediaId: MEDIA }).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ConflictException)
      expect(error instanceof ConflictException ? error.getResponse() : null).toMatchObject({ code: 'AVATAR_IN_USE' })
    })

    it('L4: 닉네임 유니크 위반은 409 NICKNAME_TAKEN', async () => {
      prisma.user.update.mockRejectedValue(uniqueViolation('nickname'))
      const error = await service.updateMe(ME, { nickname: '중복' }).catch((e: unknown) => e)
      expect(error instanceof ConflictException ? error.getResponse() : null).toMatchObject({ code: 'NICKNAME_TAKEN' })
    })

    it('M1: 아바타를 바꾸거나 해제하면 커밋 뒤 이전 사진을 정리한다(어디에도 안 쓰일 때만 — discardIfUnused)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ avatarMedia: OLD_AVATAR }).mockResolvedValue(meRow)
      await service.updateMe(ME, { avatarMediaId: MEDIA })
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: ME }, data: { avatarMediaId: MEDIA } })
      expect(media.discardIfUnused).toHaveBeenCalledWith(OLD_AVATAR)
      expect(media.discardIfUnused.mock.invocationCallOrder[0]).toBeGreaterThan(
        prisma.user.update.mock.invocationCallOrder[0] ?? Infinity,
      )

      media.discardIfUnused.mockClear()
      prisma.user.findUnique.mockResolvedValueOnce({ avatarMedia: OLD_AVATAR }).mockResolvedValue(meRow)
      await service.updateMe(ME, { avatarMediaId: null })
      expect(media.discardIfUnused).toHaveBeenCalledWith(OLD_AVATAR)
    })

    it('M1: 같은 사진으로 다시 지정하거나 아바타를 안 건드리면 정리하지 않는다', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ avatarMedia: { ...OLD_AVATAR, id: MEDIA } })
        .mockResolvedValue(meRow)
      await service.updateMe(ME, { avatarMediaId: MEDIA })
      await service.updateMe(ME, { bio: '안녕' })
      expect(media.discardIfUnused).not.toHaveBeenCalled()
      expect(media.assertUsable).toHaveBeenCalledTimes(1)
    })

    it('업데이트가 실패하면 이전 사진을 지우지 않는다', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ avatarMedia: OLD_AVATAR })
      prisma.user.update.mockRejectedValue(new Error('db down'))
      await expect(service.updateMe(ME, { avatarMediaId: MEDIA })).rejects.toThrow('db down')
      expect(media.discardIfUnused).not.toHaveBeenCalled()
    })
  })

  describe('getProfile', () => {
    const profileRow = { id: OTHER, nickname: '콩이네', bio: '산책 좋아요', avatarMedia: null }

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(profileRow)
      prisma.follow.count.mockResolvedValueOnce(5).mockResolvedValueOnce(7)
      prisma.post.count.mockResolvedValue(3)
      prisma.follow.findUnique.mockResolvedValue({ followerId: ME })
    })

    it('프로필과 팔로워·팔로잉·게시물 수, 팔로우 여부를 돌려준다', async () => {
      await expect(service.getProfile(ME, OTHER)).resolves.toEqual({
        id: OTHER,
        nickname: '콩이네',
        avatarUrl: null,
        bio: '산책 좋아요',
        followerCount: 5,
        followingCount: 7,
        postCount: 3,
        isFollowing: true,
      })
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: OTHER, status: 'ACTIVE', hiddenAt: null } }),
      )
      expect(prisma.post.count).toHaveBeenCalledWith({ where: { authorId: OTHER, hiddenAt: null, deletedAt: null } })
    })

    it('어느 쪽이든 차단 관계면 404', async () => {
      blocks.isBlockedEitherWay.mockResolvedValue(true)
      await expect(service.getProfile(ME, OTHER)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('없거나 비활성·숨김 사용자는 404', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      await expect(service.getProfile(ME, OTHER)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('내 프로필은 숨김 여부와 상관없이 보이고 isFollowing=false', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...profileRow, id: ME })
      const profile = await service.getProfile(ME, ME)
      expect(profile.isFollowing).toBe(false)
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ME, status: 'ACTIVE' } }),
      )
      expect(prisma.follow.findUnique).not.toHaveBeenCalled()
    })
  })
})
