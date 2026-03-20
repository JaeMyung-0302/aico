import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name)
  private readonly genAI: GoogleGenerativeAI
  private readonly anthropic: Anthropic | null

  constructor(private readonly configService: ConfigService) {
    const geminiKey = this.configService.get<string>('gemini.apiKey')
    if (!geminiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. Embedding will not work.')
    }
    this.genAI = new GoogleGenerativeAI(geminiKey || '')

    const anthropicKey = this.configService.get<string>('anthropic.apiKey')
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey })
      this.logger.log('Claude API initialized for answer generation')
    } else {
      this.anthropic = null
      this.logger.warn('ANTHROPIC_API_KEY is not set. Chat answers will not work.')
    }
  }

  generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const result = await model.embedContent(text)
      return result.embedding.values
    } catch (error) {
      this.logger.error('Embedding generation failed', error)
      throw error
    }
  }

  generateAnswer = async (query: string, context: string): Promise<string> => {
    if (!this.anthropic) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: '당신은 사내 온보딩 도우미입니다. 제공된 참고 문서를 기반으로 질문에 답변하세요. 문서에 없는 내용은 "해당 정보를 찾을 수 없습니다."라고 답변하세요. 답변은 간결하고 정확하게 한국어로 작성하세요.',
        messages: [
          {
            role: 'user',
            content: `질문: ${query}\n\n참고 문서:\n${context}`,
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      return textBlock ? textBlock.text : '답변을 생성할 수 없습니다.'
    } catch (error) {
      this.logger.error('Claude answer generation failed', error)
      throw error
    }
  }
}
