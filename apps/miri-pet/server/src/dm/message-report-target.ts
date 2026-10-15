import type { MediaService } from '../media/media.service'
import type { ReportTargetHandler } from '../moderation/report.service'
import type { PrismaService } from '../prisma/prisma.service'

type Prisma = Pick<PrismaService, 'message' | '$transaction'>
type Media = Pick<MediaService, 'purgeMedia'>

const MEDIA_ROW = { id: true, bucket: true, key: true, status: true } as const

export const MESSAGE_NOT_FOUND_MESSAGE = '메시지를 찾을 수 없어요'

// MESSAGE 신고: 그 대화의 멤버만, 보낸 사람과 차단 관계가 아닐 때만(그 밖에는 404로 존재를 숨긴다). 숨김 = 목록·미리보기에서 제외
// 보안 리뷰 LOW-5: 숨길 때 붙은 사진은 공개 버킷에서 지운다(Media 행 → 커밋 뒤 R2). 숨김을 해제해도 사진은 돌아오지 않는다
export const createMessageReportTarget = (prisma: Prisma, media: Media): ReportTargetHandler => ({
  notFoundMessage: MESSAGE_NOT_FOUND_MESSAGE,
  findOwnerId: async (targetId, reporterId) => {
    if (!reporterId) return null
    const message = await prisma.message.findFirst({
      where: {
        id: targetId,
        hiddenAt: null,
        conversation: { members: { some: { userId: reporterId } } },
        sender: { blocking: { none: { blockedId: reporterId } }, blockedBy: { none: { blockerId: reporterId } } },
      },
      select: { senderId: true },
    })
    return message?.senderId ?? null
  },
  hide: async (targetId) => {
    const hidden = await prisma.$transaction(async (tx) => {
      const message = await tx.message.findFirst({
        where: { id: targetId, hiddenAt: null },
        select: { media: { select: MEDIA_ROW } },
      })
      if (!message) return null
      const { count } = await tx.message.updateMany({
        where: { id: targetId, hiddenAt: null },
        data: { hiddenAt: new Date(), mediaId: null },
      })
      if (count === 0) return null
      if (message.media) await tx.media.deleteMany({ where: { id: message.media.id } })
      return { media: message.media }
    })
    if (!hidden) return false
    if (hidden.media) await media.purgeMedia([hidden.media])
    return true
  },
  unhide: async (targetId) => {
    await prisma.message.updateMany({ where: { id: targetId, hiddenAt: { not: null } }, data: { hiddenAt: null } })
  },
})
