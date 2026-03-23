import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  createChecklist = async (
    title: string,
    items: Array<{ title: string; description?: string }>,
    tenantId: string,
  ) => {
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

  getChecklists = async (tenantId: string) => {
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
    memberId: string,
  ) => {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id: checklistId, tenantId },
    })
    if (!checklist) {
      throw new NotFoundException('체크리스트를 찾을 수 없습니다.')
    }

    const existing = await this.prisma.checklistProgress.findUnique({
      where: { memberId_itemId: { memberId, itemId } },
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
        memberId,
        itemId,
        completedAt: new Date(),
      },
    })
  }

  getProgress = async (checklistId: string, memberId: string, tenantId: string) => {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id: checklistId, tenantId },
    })
    if (!checklist) {
      throw new NotFoundException('체크리스트를 찾을 수 없습니다.')
    }

    const items = await this.prisma.checklistItem.findMany({
      where: { checklistId },
      include: {
        progress: {
          where: { memberId },
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
}
