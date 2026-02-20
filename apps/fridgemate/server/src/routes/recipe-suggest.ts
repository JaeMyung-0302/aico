import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { suggestRecipes } from '../lib/gemini.js'
import { getKSTToday } from '../lib/date.js'
import { GroupRequest } from '../middleware/group-auth.js'
import { FREE_DAILY_LIMIT } from '../middleware/usage-check.js'
import type { RecipeIngredient, RecipeSuggestion, RecipeSuggestResponse, RecipeSuggestRequest } from '../types/index.js'

export const recipeSuggestRouter: RouterType = Router()

const CACHE_TTL_HOURS = 24
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const buildIngredientHash = (names: string[]): string => {
  const sorted = [...names].sort().join(',')
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16)
}

// POST /api/fridges/:fridgeId/recipe-suggest
recipeSuggestRouter.post('/:fridgeId/recipe-suggest', async (req, res: Response): Promise<void> => {
  const { groupId } = req as unknown as GroupRequest
  const fridgeId = req.params['fridgeId'] as string

  if (!UUID_REGEX.test(fridgeId)) {
    res.status(400).json({ error: 'Invalid fridge ID' })
    return
  }

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

    // 1.5. selectedItemIds 처리
    const { selectedItemIds } = (req.body ?? {}) as RecipeSuggestRequest

    if (selectedItemIds !== undefined) {
      if (
        !Array.isArray(selectedItemIds) ||
        selectedItemIds.length > 100 ||
        !selectedItemIds.every((id) => typeof id === 'string' && UUID_REGEX.test(id))
      ) {
        res.status(400).json({ error: 'selectedItemIds must be an array of valid UUIDs (max 100)' })
        return
      }
      if (selectedItemIds.length === 0) {
        res.status(400).json({ error: '최소 1개 이상의 재료를 선택해주세요' })
        return
      }
    }

    const selectedIdSet = selectedItemIds ? new Set(selectedItemIds) : null
    const targetItems = selectedIdSet
      ? allItems.filter((item) => selectedIdSet.has(item.id))
      : allItems

    if (targetItems.length === 0) {
      res.status(400).json({ error: '선택한 재료가 냉장고에 존재하지 않습니다' })
      return
    }

    // 2. ingredientHash 생성 + 캐시 확인 (usageCheck 전에 수행)
    const ingredientNames = targetItems.map((item) => item.name)
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
      const today = getKSTToday()
      const usage = await prisma.dailyUsage.findUnique({
        where: { groupId_date: { groupId, date: today } },
      })

      const response: RecipeSuggestResponse = {
        recipes: cachedResponse.recipes,
        cached: true,
        remainingCount: Math.max(0, FREE_DAILY_LIMIT - (usage?.count ?? 0)),
      }
      res.json(response)
      return
    }

    // 3. 캐시 미스 → 사용량 확인
    const today = getKSTToday()
    const usage = await prisma.dailyUsage.findUnique({
      where: { groupId_date: { groupId, date: today } },
    })
    const currentCount = usage?.count ?? 0

    if (currentCount >= FREE_DAILY_LIMIT) {
      res.status(403).json({
        error: '오늘의 무료 추천 횟수를 모두 사용했습니다',
        remainingCount: 0,
      })
      return
    }

    // 4. Gemini API 호출
    const foodItemInputs = targetItems.map((item) => {
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
      const todayStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()))
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

    // 5. inFridge 매칭
    const fridgeNameSet = new Set(ingredientNames.map((n) => n.toLowerCase()))
    const recipes: RecipeSuggestion[] = geminiRecipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ing): RecipeIngredient => ({
        ...ing,
        inFridge: fridgeNameSet.has(ing.name.toLowerCase()),
      })),
    }))

    // 6. $transaction으로 RecipeHistory 저장 + DailyUsage 증가
    const updatedUsage = await prisma.$transaction(async (tx) => {
      await tx.recipeHistory.create({
        data: {
          groupId,
          fridgeId,
          ingredientHash,
          ingredients: targetItems.map((i) => ({
            name: i.name,
            category: i.category,
            expiryDate: i.expiryDate,
          })),
          response: JSON.parse(JSON.stringify({ recipes })),
        },
      })

      return tx.dailyUsage.upsert({
        where: { groupId_date: { groupId, date: today } },
        update: { count: { increment: 1 } },
        create: { groupId, date: today, count: 1 },
      })
    })

    // 7. 응답
    const response: RecipeSuggestResponse = {
      recipes,
      cached: false,
      remainingCount: Math.max(0, FREE_DAILY_LIMIT - updatedUsage.count),
    }

    res.json(response)
  } catch (error) {
    console.error('Recipe suggest error:', error)
    res.status(500).json({ error: '레시피 추천에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
})
