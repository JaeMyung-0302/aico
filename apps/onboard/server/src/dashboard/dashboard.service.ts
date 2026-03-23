import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  getTeamStats = async (tenantId: string) => {
    const [teamSize, documentCount, chatUsage, checklistCount] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId } }),
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.chatMessage.count({
        where: { session: { tenantId } },
      }),
      this.prisma.checklist.count({ where: { tenantId } }),
    ])

    return { teamSize, documentCount, chatUsage, checklistCount }
  }

  getMembersProgress = async (tenantId: string) => {
    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        checklistProgress: {
          where: { completedAt: { not: null } },
        },
      },
    })

    const totalItems = await this.prisma.checklistItem.count({
      where: { checklist: { tenantId } },
    })

    return members.map((member) => ({
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      completedItems: member.checklistProgress.length,
      totalItems,
      progressPercent: totalItems > 0
        ? Math.round((member.checklistProgress.length / totalItems) * 100)
        : 0,
    }))
  }
}
