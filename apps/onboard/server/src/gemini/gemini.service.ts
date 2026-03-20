import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name)
  private readonly genAI: GoogleGenerativeAI

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey')
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. AI features will not work.')
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '')
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

  generateAnswer = async (prompt: string, context: string): Promise<string> => {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${prompt}\n\n참고 문서:\n${context}` }],
          },
        ],
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: '당신은 사내 온보딩 도우미입니다. 제공된 문서를 기반으로 질문에 답변하세요. 문서에 없는 내용은 모른다고 답변하세요. 답변은 간결하고 정확하게 한국어로 작성하세요.',
            },
          ],
        },
      })

      return result.response.text()
    } catch (error) {
      this.logger.error('Answer generation failed', error)
      throw error
    }
  }
}
