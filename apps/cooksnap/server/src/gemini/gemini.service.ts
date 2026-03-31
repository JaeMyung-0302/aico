import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink, mkdtemp } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const execFileAsync = promisify(execFile)

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
  private fileManager: GoogleAIFileManager | null = null

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey')
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
      this.fileManager = new GoogleAIFileManager(apiKey)
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

  private static readonly DIRECT_URL_HOSTS = new Set([
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

  private isDirectUrlSupported = (url: string): boolean => {
    const parsed = new URL(url)
    return GeminiService.DIRECT_URL_HOSTS.has(parsed.hostname)
  }

  // yt-dlp로 캡션(설명글) 추출
  private extractCaption = async (videoUrl: string): Promise<string> => {
    try {
      const { stdout } = await execFileAsync('yt-dlp', [
        '--print', 'description',
        '--no-download',
        '--socket-timeout', '15',
        videoUrl,
      ], { timeout: 30_000 })

      const caption = stdout.trim()
      if (caption && caption !== 'NA') {
        this.logger.log(`캡션 추출 완료 (${caption.length}자)`)
        return caption
      }
      return ''
    } catch {
      this.logger.warn('캡션 추출 실패 — 영상만으로 분석 진행')
      return ''
    }
  }

  // yt-dlp로 영상 다운로드
  private downloadVideo = async (videoUrl: string): Promise<string> => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cooksnap-'))
    const outputPath = join(tempDir, `${randomUUID()}.mp4`)

    this.logger.log(`영상 다운로드 시작: ${videoUrl}`)

    try {
      await execFileAsync('yt-dlp', [
        '-f', 'mp4[height<=720]/best[height<=720]/mp4/best',
        '--max-filesize', '50M',
        '-o', outputPath,
        '--no-playlist',
        '--socket-timeout', '30',
        videoUrl,
      ], { timeout: 120_000 })

      this.logger.log(`영상 다운로드 완료: ${outputPath}`)
      return outputPath
    } catch (error) {
      await this.cleanupFile(outputPath)
      this.logger.error('영상 다운로드 실패', error)
      throw new Error('영상을 다운로드할 수 없습니다. URL을 확인해주세요.')
    }
  }

  // Gemini File API로 업로드
  private uploadToGemini = async (filePath: string): Promise<string> => {
    if (!this.fileManager) {
      throw new Error('Gemini API key가 설정되지 않았습니다.')
    }

    this.logger.log('Gemini File API 업로드 시작')

    const uploadResult = await this.fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: `cooksnap-${randomUUID()}`,
    })

    // 파일 처리 완료 대기
    let file = uploadResult.file
    while (file.state === FileState.PROCESSING) {
      this.logger.log('파일 처리 대기 중...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      file = await this.fileManager.getFile(file.name)
    }

    if (file.state === FileState.FAILED) {
      throw new Error('Gemini 파일 처리에 실패했습니다.')
    }

    this.logger.log(`Gemini 업로드 완료: ${file.uri}`)
    return file.uri
  }

  private cleanupFile = async (filePath: string): Promise<void> => {
    try {
      await unlink(filePath)
    } catch {
      // 파일 삭제 실패는 무시
    }
  }

  // 영상 URL 분석
  analyzeVideoUrl = async (videoUrl: string): Promise<GeminiRecipeResult> => {
    this.validateVideoUrl(videoUrl)
    const model = this.getModel()

    // YouTube는 직접 URL 분석, Instagram/TikTok은 다운로드 후 업로드
    if (this.isDirectUrlSupported(videoUrl)) {
      return this.analyzeWithDirectUrl(model, videoUrl)
    }
    return this.analyzeWithDownload(model, videoUrl)
  }

  // YouTube: 직접 URL 전달
  private analyzeWithDirectUrl = async (
    model: ReturnType<typeof this.getModel>,
    videoUrl: string,
  ): Promise<GeminiRecipeResult> => {
    this.logger.log(`YouTube URL 직접 분석: ${videoUrl}`)

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

      this.logger.log('Gemini URL 분석 완료')
      return JSON.parse(result.response.text()) as GeminiRecipeResult
    } catch (error) {
      this.logger.error('Gemini URL 분석 실패', error)
      throw new Error('영상 분석에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 캡션이 있으면 프롬프트에 포함
  private buildPrompt = (caption: string): string => {
    if (!caption) return this.recipePrompt

    return `${this.recipePrompt}

아래는 게시물의 캡션(설명글)입니다. 영상 내용과 함께 참고하여 더 정확한 레시피를 추출하세요.
특히 캡션에 재료, 분량, 조리 팁이 있다면 반드시 반영하세요.

---
${caption}
---`
  }

  // Instagram/TikTok: 캡션 추출 + 다운로드 → 업로드 → 분석
  private analyzeWithDownload = async (
    model: ReturnType<typeof this.getModel>,
    videoUrl: string,
  ): Promise<GeminiRecipeResult> => {
    this.logger.log(`영상 다운로드 후 분석: ${videoUrl}`)

    let filePath: string | null = null

    try {
      const [caption, downloadedPath] = await Promise.all([
        this.extractCaption(videoUrl),
        this.downloadVideo(videoUrl),
      ])
      filePath = downloadedPath

      const fileUri = await this.uploadToGemini(filePath)
      const prompt = this.buildPrompt(caption)

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: 'video/mp4',
            fileUri,
          },
        },
        { text: prompt },
      ])

      this.logger.log('Gemini 파일 분석 완료')
      return JSON.parse(result.response.text()) as GeminiRecipeResult
    } catch (error) {
      this.logger.error('영상 다운로드 분석 실패', error)
      if (error instanceof Error && error.message.includes('다운로드')) {
        throw error
      }
      throw new Error('영상 분석에 실패했습니다. 다시 시도해주세요.')
    } finally {
      if (filePath) {
        await this.cleanupFile(filePath)
      }
    }
  }
}
