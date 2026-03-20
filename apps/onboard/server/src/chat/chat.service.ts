import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GeminiService } from '../gemini/gemini.service'
import { VectorSearchService } from '../knowledge-base/vector-search.service'
import { buildPrompt } from './prompt.template'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  createSession = async (userId: string, tenantId: string, title?: string) => {
    await this.verifyMembership(tenantId, userId)

    return this.prisma.chatSession.create({
      data: {
        title: title || '새 대화',
        userId,
        tenantId,
      },
    })
  }

  getSessions = async (userId: string, tenantId: string) => {
    return this.prisma.chatSession.findMany({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
      },
    })
  }

  getSessionMessages = async (sessionId: string, userId: string, tenantId: string) => {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.')
    }
    if (session.userId !== userId || session.tenantId !== tenantId) {
      throw new ForbiddenException('접근 권한이 없습니다.')
    }

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
  }

  askQuestion = async (sessionId: string, query: string, userId: string, tenantId: string) => {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.')
    }
    if (session.userId !== userId || session.tenantId !== tenantId) {
      throw new ForbiddenException('접근 권한이 없습니다.')
    }

    await this.prisma.chatMessage.create({
      data: { role: 'user', content: query, sessionId },
    })

    let answer: string
    let sources: Array<{ documentId: string; content: string; similarity: number }> = []

    try {
      const searchResults = await this.vectorSearchService.similaritySearch(query, tenantId, 5)

      sources = searchResults.map((r) => ({
        documentId: r.documentId,
        content: r.content.substring(0, 200),
        similarity: r.similarity,
      }))

      const { userPrompt } = buildPrompt(query, searchResults)
      answer = await this.geminiService.generateAnswer(query, userPrompt)
    } catch (error) {
      this.logger.error('Failed to generate answer', error)
      answer = '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: answer,
        sources: JSON.parse(JSON.stringify(sources)),
        sessionId,
      },
    })

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    })

    return assistantMessage
  }

  private verifyMembership = async (tenantId: string, userId: string) => {
    const member = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!member) {
      throw new ForbiddenException('이 팀에 접근 권한이 없습니다.')
    }
  }
}
