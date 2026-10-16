import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Me, UpdateMeRequest, UserProfile } from '@miri-pet/shared'
import { AVATAR_IN_USE, isAvatarUniqueViolation, isUniqueViolation } from '../common/prisma/prisma-errors'
import { publicMediaUrl, toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import { MediaService } from '../media/media.service'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'

const notFound = () => new NotFoundException('사용자를 찾을 수 없어요')

const conflictFrom = (error: unknown): ConflictException =>
  isAvatarUniqueViolation(error)
    ? new ConflictException({ code: AVATAR_IN_USE, message: '이미 다른 프로필에 쓰인 사진이에요' })
    : new ConflictException({ code: 'NICKNAME_TAKEN', message: '이미 사용 중인 닉네임이에요' })

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentService,
    private readonly blocks: BlockService,
    private readonly config: ConfigService,
    private readonly media: MediaService,
  ) {}

  private get publicBaseUrl(): string {
    return this.config.get<string>('r2.publicBaseUrl') ?? ''
  }

  async getMe(userId: string): Promise<Me> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        bio: true,
        role: true,
        notifyVaccination: true,
        notifySocial: true,
        notifyDm: true,
        avatarMedia: { select: { key: true, status: true } },
      },
    })
    if (!user) throw notFound()
    const hasRequiredConsents = await this.consents.hasRequiredConsents(userId)
    const { avatarMedia, nickname, ...rest } = user
    return {
      ...rest,
      nickname: nickname ?? '',
      avatarUrl: publicMediaUrl(this.publicBaseUrl, avatarMedia),
      hasRequiredConsents,
    }
  }

  async updateMe(userId: string, body: UpdateMeRequest): Promise<Me> {
    // 내 것 + READY + AVATAR 용도만 (MEDIA_NOT_USABLE 422)
    if (body.avatarMediaId) await this.media.assertUsable(userId, [body.avatarMediaId], 'AVATAR')
    const previous =
      body.avatarMediaId !== undefined
        ? await this.prisma.user.findUnique({
            where: { id: userId },
            select: { avatarMedia: { select: { id: true, bucket: true, key: true, status: true } } },
          })
        : null
    try {
      await this.prisma.user.update({ where: { id: userId }, data: body })
    } catch (error) {
      if (isUniqueViolation(error)) throw conflictFrom(error)
      throw error
    }
    // 보안 리뷰 M1: 교체·해제된 이전 사진은 커밋 뒤 정리(다른 곳에 안 쓰일 때만 행 + R2 삭제)
    const replaced = previous?.avatarMedia
    if (replaced && replaced.id !== body.avatarMediaId) await this.media.discardIfUnused(replaced)
    return this.getMe(userId)
  }

  // 차단 관계(양방향)·탈퇴·정지·신고 숨김 사용자는 404 (존재 여부도 노출하지 않는다)
  async getProfile(viewerId: string, userId: string): Promise<UserProfile> {
    const isSelf = viewerId === userId
    if (!isSelf && (await this.blocks.isBlockedEitherWay(viewerId, userId))) throw notFound()
    const user = await this.prisma.user.findFirst({
      where: isSelf ? { id: userId, status: 'ACTIVE' } : { id: userId, status: 'ACTIVE', hiddenAt: null },
      select: { ...USER_SUMMARY_SELECT, bio: true },
    })
    if (!user) throw notFound()
    const [followerCount, followingCount, postCount, follow] = await Promise.all([
      this.prisma.follow.count({ where: { followeeId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.post.count({ where: { authorId: userId, hiddenAt: null, deletedAt: null } }),
      isSelf
        ? Promise.resolve(null)
        : this.prisma.follow.findUnique({
            where: { followerId_followeeId: { followerId: viewerId, followeeId: userId } },
            select: { followerId: true },
          }),
    ])
    return {
      ...toUserSummary(user, this.publicBaseUrl),
      bio: user.bio,
      followerCount,
      followingCount,
      postCount,
      isFollowing: follow !== null,
    }
  }
}
