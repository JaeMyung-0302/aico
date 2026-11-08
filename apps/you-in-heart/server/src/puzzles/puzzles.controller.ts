import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import {
  type CreatePuzzleRequest,
  createPuzzleRequestSchema,
  idSchema,
  type PuzzleDetail,
  type PuzzleListResponse,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { PuzzlesService } from './puzzles.service'

const idPipe = new ZodValidationPipe(idSchema)

@Controller('puzzles')
@Authenticated()
export class PuzzlesController {
  constructor(private readonly puzzles: PuzzlesService) {}

  @Get()
  list(@CurrentCouple() couple: CoupleContext): Promise<PuzzleListResponse> {
    return this.puzzles.list(couple.id)
  }

  @Post()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPuzzleRequestSchema)) body: CreatePuzzleRequest,
  ): Promise<PuzzleDetail> {
    return this.puzzles.create(couple.id, me.id, body)
  }

  @Get(':id')
  get(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<PuzzleDetail> {
    return this.puzzles.get(couple.id, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<void> {
    return this.puzzles.remove(couple.id, id)
  }
}
