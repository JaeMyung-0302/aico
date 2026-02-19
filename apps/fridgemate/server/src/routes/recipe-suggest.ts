import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { suggestRecipes } from '../lib/gemini.js'
import { GroupRequest } from '../middleware/group-auth.js'
import { usageCheck } from '../middleware/usage-check.js'
import type { RecipeIngredient, RecipeSuggestion, RecipeSuggestResponse } from '../types/index.js'

export const recipeSuggestRouter: RouterType = Router()

const CACHE_TTL_HOURS = 24

const buildIngredientHash = (names: string[]): string => {
  const sorted = [...names].sort().join(',')
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16)
}

// POST /api/fridges/:fridgeId/recipe-suggest
recipeSuggestRouter.post('/:fridgeId/recipe-suggest', usageCheck, async (req, res: Response): Promise<void> => {
  const { groupId } = req as GroupRequest
  const fridgeId = req.params['fridgeId'] as string

  try {
    // 1. 냉장고의 전체 재료 조회
    const fridge = await prisma.fridge.findUnique({
      where: { id: fridgeId },
      include: {
        compartments: {
          include: {
            foodItems: true,
          },
        },
      },
    })

    if (!fridge || fridge.groupId !== groupId) {
      res.status(404).json({ error: 'Fridge not found' })
      return
    }

    const allItems = fridge.compartments.flatMap((c) => c.foodItems)

    if (allItems.length === 0) {
      res.status(400).json({ error: '냉장고에 재료가 없습니다. 재료를 먼저 등록해주세요.' })
      return
    }

    // 2. ingredientHash 생성 + 캐시 확인
    const ingredientNames = allItems.map((item) => item.name)
    const ingredientHash = buildIngredientHash(ingredientNames)
    const cacheThreshold = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000)

    const cached = await prisma.recipeHistory.findFirst({
      where: {
        fridgeId,
        ingredientHash,
        createdAt: { gte: cacheThreshold },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (cached) {
      const cachedResponse = cached.response as unknown as { recipes: RecipeSuggestion[] }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const usage = await prisma.dailyUsage.findUnique({
        where: { groupId_date: { groupId, date: today } },
      })

      const response: RecipeSuggestResponse = {
        recipes: cachedResponse.recipes,
        cached: true,
        remainingCount: Math.max(0, 2 - (usage?.count ?? 0)),
      }
      res.json(response)
      return
    }

    // 3. Gemini API 호출
    const foodItemInputs = allItems.map((item) => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const daysUntilExpiry = item.expiryDate
        ? Math.floor((new Date(item.expiryDate).getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        name: item.name,
        category: item.category,
        expiryDate: item.expiryDate?.toISOString() ?? null,
        daysUntilExpiry,
      }
    })

    const geminiRecipes = await suggestRecipes(foodItemInputs)

    // 4. inFridge 매칭
    const fridgeNameSet = new Set(ingredientNames.map((n) => n.toLowerCase()))
    const recipes: RecipeSuggestion[] = geminiRecipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ing): RecipeIngredient => ({
        ...ing,
        inFridge: fridgeNameSet.has(ing.name.toLowerCase()),
      })),
    }))

    // 5. RecipeHistory 저장 + DailyUsage 증가
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await Promise.all([
      prisma.recipeHistory.create({
        data: {
          groupId,
          fridgeId,
          ingredientHash,
          ingredients: allItems.map((i) => ({
            name: i.name,
            category: i.category,
            expiryDate: i.expiryDate,
          })),
          response: JSON.parse(JSON.stringify({ recipes })),
        },
      }),
      prisma.dailyUsage.upsert({
        where: { groupId_date: { groupId, date: today } },
        update: { count: { increment: 1 } },
        create: { groupId, date: today, count: 1 },
      }),
    ])

    // 6. 잔여 횟수 계산
    const updatedUsage = await prisma.dailyUsage.findUnique({
      where: { groupId_date: { groupId, date: today } },
    })

    const response: RecipeSuggestResponse = {
      recipes,
      cached: false,
      remainingCount: Math.max(0, 2 - (updatedUsage?.count ?? 0)),
    }

    res.json(response)
  } catch (error) {
    console.error('Recipe suggest error:', error)
    res.status(500).json({ error: '레시피 추천에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
})
