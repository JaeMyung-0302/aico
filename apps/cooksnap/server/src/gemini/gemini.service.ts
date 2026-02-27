import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai'

// Gemini 응답 타입
export interface GeminiRecipeResult {
  title: string
  description: string
  difficulty: string
  cookTime: number
  servings: number
  ingredients: {
    name: string
    amount: string
    unit: string
  }[]
  steps: {
    stepNumber: number
    description: string
  }[]
}

// Gemini responseSchema 정의
const recipeResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: '요리 이름 (한국어)' },
    description: { type: SchemaType.STRING, description: '요리 간단 설명' },
    difficulty: {
      type: SchemaType.STRING,
      description: '난이도 (easy, medium, hard 중 하나)',
    },
    cookTime: { type: SchemaType.INTEGER, description: '조리 시간(분)' },
    servings: { type: SchemaType.INTEGER, description: '인분 수' },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: '재료명 (한국어)' },
          amount: { type: SchemaType.STRING, description: '양 (숫자)' },
          unit: {
            type: SchemaType.STRING,
            description: '단위 (g, ml, 개, 모, 큰술 등)',
          },
        },
        required: ['name'],
      },
    },
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          stepNumber: { type: SchemaType.INTEGER, description: '단계 번호' },
          description: { type: SchemaType.STRING, description: '조리 설명' },
        },
        required: ['stepNumber', 'description'],
      },
    },
  },
  required: ['title', 'ingredients', 'steps'],
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name)
  private genAI: GoogleGenerativeAI | null = null

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey')
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
  }

  private readonly recipePrompt = `당신은 요리 전문가입니다. 이 요리 영상을 시청하고 레시피를 추출하세요.

다음을 추출하세요:
1. 요리 이름 (한국어)
2. 간단한 요리 설명
3. 난이도 (easy/medium/hard)
4. 조리 시간(분)
5. 인분 수
6. 모든 재료 (이름, 양, 단위) - 영상에서 보이는 텍스트와 사용되는 재료 모두 포함
7. 조리 단계 (번호, 설명)

재료의 양이 명확하지 않으면 최선의 추정치를 제공하세요.
모든 텍스트는 한국어로 작성하세요.`

  private getModel = () => {
    if (!this.genAI) {
      throw new Error('Gemini API key가 설정되지 않았습니다.')
    }
    return this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: recipeResponseSchema,
      },
    })
  }

  private static readonly ALLOWED_HOSTS = new Set([
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
  ])

  private validateVideoUrl = (url: string): void => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        throw new BadRequestException('HTTPS URL만 허용됩니다.')
      }
      if (!GeminiService.ALLOWED_HOSTS.has(parsed.hostname)) {
        throw new BadRequestException('허용되지 않은 도메인입니다.')
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('유효하지 않은 URL입니다.')
    }
  }

  // 영상 URL 직접 분석 (다운로드 불필요)
  analyzeVideoUrl = async (videoUrl: string): Promise<GeminiRecipeResult> => {
    this.validateVideoUrl(videoUrl)
    const model = this.getModel()

    this.logger.log(`영상 URL 직접 분석: ${videoUrl}`)

    try {
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: 'video/mp4',
            fileUri: videoUrl,
          },
        },
        { text: this.recipePrompt },
      ])
      const text = result.response.text()

      this.logger.log('Gemini URL 분석 완료')

      return JSON.parse(text) as GeminiRecipeResult
    } catch (error) {
      this.logger.error('Gemini URL 분석 실패', error)
      throw new Error('영상 분석에 실패했습니다. 다시 시도해주세요.')
    }
  }
}
