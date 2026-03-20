import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  createChecklist = async (
    title: string,
    items: Array<{ title: string; description?: string }>,
    tenantId: string,
    userId: string,
  ) => {
    await this.verifyMembership(tenantId, userId)

    return this.prisma.checklist.create({
      data: {
        title,
        tenantId,
        items: {
          create: items.map((item, index) => ({
            title: item.title,
            description: item.description,
            orderIndex: index,
          })),
        },
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    })
  }

  getChecklists = async (tenantId: string, userId: string) => {
    await this.verifyMembership(tenantId, userId)

    return this.prisma.checklist.findMany({
      where: { tenantId },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
          include: { _count: { select: { progress: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  toggleItem = async (
    checklistId: string,
    itemId: string,
    tenantId: string,
    userId: string,
  ) => {
    const member = await this.verifyMembership(tenantId, userId)

    const checklist = await this.prisma.checklist.findFirst({
      where: { id: checklistId, tenantId },
    })
    if (!checklist) {
      throw new NotFoundException('체크리스트를 찾을 수 없습니다.')
    }

    const existing = await this.prisma.checklistProgress.findUnique({
      where: { memberId_itemId: { memberId: member.id, itemId } },
    })

    if (existing) {
      if (existing.completedAt) {
        return this.prisma.checklistProgress.update({
          where: { id: existing.id },
          data: { completedAt: null },
        })
      }
      return this.prisma.checklistProgress.update({
        where: { id: existing.id },
        data: { completedAt: new Date() },
      })
    }

    return this.prisma.checklistProgress.create({
      data: {
        memberId: member.id,
        itemId,
        completedAt: new Date(),
      },
    })
  }

  getProgress = async (checklistId: string, tenantId: string, userId: string) => {
    const member = await this.verifyMembership(tenantId, userId)

    const items = await this.prisma.checklistItem.findMany({
      where: { checklistId },
      include: {
        progress: {
          where: { memberId: member.id },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      completed: item.progress.length > 0 && item.progress[0]?.completedAt != null,
    }))
  }

  private verifyMembership = async (tenantId: string, userId: string) => {
    const member = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!member) {
      throw new ForbiddenException('이 팀에 접근 권한이 없습니다.')
    }
    return member
  }
}
