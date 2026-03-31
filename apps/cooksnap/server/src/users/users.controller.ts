import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { AuthGuard } from '../auth/guards/auth.guard'
// TODO: PMF 검증 완료 후 사용 복구
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PremiumGuard } from '../premium/guards/premium.guard'
import { PremiumService } from '../premium/premium.service'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('users/me')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly premiumService: PremiumService,
  ) {}

  // 오늘 분석 쿼터 조회
  @Get('quota')
  getQuota(@Req() req: AuthenticatedRequest) {
    return this.premiumService.getQuota(req.user.id)
  }

  @Get('recipes')
  getSavedRecipes(@Req() req: AuthenticatedRequest) {
    return this.usersService.getSavedRecipes(req.user.id)
  }

  @Get('recipes/:recipeId/saved')
  isRecipeSaved(@Req() req: AuthenticatedRequest, @Param('recipeId') recipeId: string) {
    return this.usersService.isRecipeSaved(req.user.id, recipeId)
  }

  // TODO: PMF 검증 완료 후 @UseGuards(PremiumGuard) 복구
  @Post('recipes/:recipeId/save')
  saveRecipe(@Req() req: AuthenticatedRequest, @Param('recipeId') recipeId: string) {
    return this.usersService.saveRecipe(req.user.id, recipeId)
  }

  // TODO: PMF 검증 완료 후 @UseGuards(PremiumGuard) 복구
  @Delete('recipes/:recipeId/save')
  unsaveRecipe(@Req() req: AuthenticatedRequest, @Param('recipeId') recipeId: string) {
    return this.usersService.unsaveRecipe(req.user.id, recipeId)
  }

  @Get('history')
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.usersService.getHistory(req.user.id)
  }
}
