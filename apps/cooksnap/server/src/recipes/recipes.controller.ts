import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { RecipesService } from './recipes.service'
import { KamisService } from '../kamis/kamis.service'
import { CoupangService } from '../coupang/coupang.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { AnalyzeRecipeDto } from './dto/analyze-recipe.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly kamisService: KamisService,
    private readonly coupangService: CoupangService,
  ) {}

  @Post('analyze')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  analyze(@Body() dto: AnalyzeRecipeDto, @Req() req: AuthenticatedRequest) {
    return this.recipesService.analyze(dto.url, req.user.id)
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.recipesService.findById(id, req.user.id)
  }

  @Get(':id/prices')
  @UseGuards(AuthGuard)
  async getPrices(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.recipesService.checkOwnership(id, req.user.id)
    return this.kamisService.getRecipePrices(id)
  }

  @Get(':id/purchase-links')
  @UseGuards(AuthGuard)
  async getPurchaseLinks(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.recipesService.checkOwnership(id, req.user.id)
    return this.coupangService.getPurchaseLinks(id)
  }
}
