import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 저장된 레시피 목록 조회
  getSavedRecipes = async (userId: string) => {
    return this.prisma.savedRecipe.findMany({
      where: { userId },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            totalPrice: true,
            difficulty: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // 레시피 저장 여부 확인
  isRecipeSaved = async (userId: string, recipeId: string) => {
    const record = await this.prisma.savedRecipe.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
      select: { id: true },
    })
    return { saved: !!record }
  }

  // 레시피 저장
  saveRecipe = async (userId: string, recipeId: string) => {
    // 레시피 존재 확인
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    })
    if (!recipe) {
      throw new NotFoundException('레시피를 찾을 수 없습니다.')
    }

    return this.prisma.savedRecipe.upsert({
      where: {
        userId_recipeId: { userId, recipeId },
      },
      update: {},
      create: { userId, recipeId },
    })
  }

  // 레시피 저장 취소
  unsaveRecipe = async (userId: string, recipeId: string) => {
    return this.prisma.savedRecipe.deleteMany({
      where: { userId, recipeId },
    })
  }

  // 분석 히스토리 조회
  getHistory = async (userId: string) => {
    return this.prisma.analysisHistory.findMany({
      where: { userId },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }
}
