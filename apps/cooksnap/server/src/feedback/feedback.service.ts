import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { FeedbackQueryDto } from './dto/feedback-query.dto'
import type { FeedbackStatus } from '../generated/prisma'

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  create = (userId: string, dto: CreateFeedbackDto) => {
    return this.prisma.feedback.create({
      data: {
        userId,
        category: dto.category,
        content: dto.content,
      },
    })
  }

  findAll = async (query: FeedbackQueryDto) => {
    const where = {
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
    }

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include: {
          user: { select: { email: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.feedback.count({ where }),
    ])

    return { data, total, page: query.page, limit: query.limit }
  }

  updateStatus = async (id: string, status: FeedbackStatus) => {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } })
    if (!feedback) {
      throw new NotFoundException('피드백을 찾을 수 없습니다.')
    }
    return this.prisma.feedback.update({
      where: { id },
      data: { status },
    })
  }
}
