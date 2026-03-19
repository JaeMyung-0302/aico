import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { RecipesService } from './recipes.service'
import { PrismaService } from '../prisma/prisma.service'
import { GeminiService } from '../gemini/gemini.service'
import { PremiumService } from '../premium/premium.service'

const makePrisma = () => ({
  recipe: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  analysisHistory: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
})

const makeGemini = () => ({
  analyzeVideoUrl: jest.fn(),
})

const makePremium = () => ({
  getQuota: jest.fn(),
  incrementUsage: jest.fn(),
})

const makeGeminiResult = (override = {}) => ({
  title: '김치찌개',
  description: '맛있는 김치찌개',
  difficulty: 'easy',
  cookTime: 30,
  servings: 2,
  ingredients: [{ name: '김치', amount: '200', unit: 'g' }],
  steps: [{ stepNumber: 1, description: '김치를 볶는다' }],
  ...override,
})

describe('RecipesService.analyze()', () => {
  let service: RecipesService
  let prisma: ReturnType<typeof makePrisma>
  let gemini: ReturnType<typeof makeGemini>
  let premium: ReturnType<typeof makePremium>

  beforeEach(async () => {
    prisma = makePrisma()
    gemini = makeGemini()
    premium = makePremium()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiService, useValue: gemini },
        { provide: PremiumService, useValue: premium },
      ],
    }).compile()

    service = module.get<RecipesService>(RecipesService)
  })

  it('쿼터 초과 → ForbiddenException', async () => {
    premium.getQuota.mockResolvedValue({ allowed: false })

    await expect(service.analyze('https://instagram.com/reel/x', 'u-1')).rejects.toThrow(
      ForbiddenException,
    )
    expect(prisma.recipe.findFirst).not.toHaveBeenCalled()
  })

  it('이미 분석된 URL → 기존 id 반환, incrementUsage 미호출', async () => {
    premium.getQuota.mockResolvedValue({ allowed: true })
    prisma.recipe.findFirst.mockResolvedValue({ id: 'existing-id' })
    prisma.analysisHistory.findFirst.mockResolvedValue(null)
    prisma.analysisHistory.create.mockResolvedValue({})

    const result = await service.analyze('https://instagram.com/reel/x', 'u-1')

    expect(result).toEqual({ id: 'existing-id' })
    expect(premium.incrementUsage).not.toHaveBeenCalled()
    expect(gemini.analyzeVideoUrl).not.toHaveBeenCalled()
  })

  it('Gemini 결과에 title 없음 → BadRequestException', async () => {
    premium.getQuota.mockResolvedValue({ allowed: true })
    prisma.recipe.findFirst.mockResolvedValue(null)
    gemini.analyzeVideoUrl.mockResolvedValue(makeGeminiResult({ title: '' }))

    await expect(service.analyze('https://tiktok.com/@a/video/1', 'u-1')).rejects.toThrow(
      BadRequestException,
    )
    expect(prisma.recipe.create).not.toHaveBeenCalled()
  })

  it('Gemini 결과 ingredients 빈 배열 → BadRequestException', async () => {
    premium.getQuota.mockResolvedValue({ allowed: true })
    prisma.recipe.findFirst.mockResolvedValue(null)
    gemini.analyzeVideoUrl.mockResolvedValue(makeGeminiResult({ ingredients: [] }))

    await expect(service.analyze('https://youtu.be/abc', 'u-1')).rejects.toThrow(
      BadRequestException,
    )
  })

  it('새 URL + Gemini 성공 → recipe 생성 + incrementUsage 호출', async () => {
    premium.getQuota.mockResolvedValue({ allowed: true })
    prisma.recipe.findFirst.mockResolvedValue(null)
    gemini.analyzeVideoUrl.mockResolvedValue(makeGeminiResult())
    prisma.recipe.create.mockResolvedValue({ id: 'new-id', title: '김치찌개' })
    prisma.analysisHistory.findFirst.mockResolvedValue(null)
    prisma.analysisHistory.create.mockResolvedValue({})
    premium.incrementUsage.mockResolvedValue(undefined)

    const result = await service.analyze('https://instagram.com/reel/new', 'u-1')

    expect(result).toEqual({ id: 'new-id' })
    expect(prisma.recipe.create).toHaveBeenCalledTimes(1)
    expect(premium.incrementUsage).toHaveBeenCalledWith('u-1')
  })

  it('instagram URL → videoPlatform = "instagram"', async () => {
    premium.getQuota.mockResolvedValue({ allowed: true })
    prisma.recipe.findFirst.mockResolvedValue(null)
    gemini.analyzeVideoUrl.mockResolvedValue(makeGeminiResult())
    prisma.recipe.create.mockResolvedValue({ id: 'r-1', title: '김치찌개' })
    prisma.analysisHistory.findFirst.mockResolvedValue(null)
    prisma.analysisHistory.create.mockResolvedValue({})
    premium.incrementUsage.mockResolvedValue(undefined)

    await service.analyze('https://instagram.com/reel/xyz', 'u-1')

    expect(prisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoPlatform: 'instagram' }),
      }),
    )
  })
})

describe('RecipesService.checkOwnership()', () => {
  let service: RecipesService
  let prisma: ReturnType<typeof makePrisma>

  beforeEach(async () => {
    prisma = makePrisma()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiService, useValue: makeGemini() },
        { provide: PremiumService, useValue: makePremium() },
      ],
    }).compile()

    service = module.get<RecipesService>(RecipesService)
  })

  it('히스토리 있음 → throw 없음', async () => {
    prisma.analysisHistory.findFirst.mockResolvedValue({ id: 'h-1' })

    await expect(service.checkOwnership('r-1', 'u-1')).resolves.toBeUndefined()
  })

  it('히스토리 없음 → ForbiddenException', async () => {
    prisma.analysisHistory.findFirst.mockResolvedValue(null)

    await expect(service.checkOwnership('r-1', 'u-1')).rejects.toThrow(ForbiddenException)
  })
})

describe('RecipesService.findById()', () => {
  let service: RecipesService
  let prisma: ReturnType<typeof makePrisma>

  beforeEach(async () => {
    prisma = makePrisma()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiService, useValue: makeGemini() },
        { provide: PremiumService, useValue: makePremium() },
      ],
    }).compile()

    service = module.get<RecipesService>(RecipesService)
  })

  it('레시피 없음 → NotFoundException', async () => {
    prisma.recipe.findUnique.mockResolvedValue(null)

    await expect(service.findById('r-1', 'u-1')).rejects.toThrow(NotFoundException)
  })

  it('레시피 있음 + 소유권 없음 → ForbiddenException', async () => {
    prisma.recipe.findUnique.mockResolvedValue({ id: 'r-1', ingredients: [], steps: [] })
    prisma.analysisHistory.findFirst.mockResolvedValue(null)

    await expect(service.findById('r-1', 'u-1')).rejects.toThrow(ForbiddenException)
  })

  it('레시피 있음 + 소유권 있음 → recipe 반환', async () => {
    const recipe = { id: 'r-1', title: '김치찌개', ingredients: [], steps: [] }
    prisma.recipe.findUnique.mockResolvedValue(recipe)
    prisma.analysisHistory.findFirst.mockResolvedValue({ id: 'h-1' })

    const result = await service.findById('r-1', 'u-1')

    expect(result).toEqual(recipe)
  })
})
