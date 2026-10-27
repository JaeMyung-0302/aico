import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import {
  type BucketItem,
  type BucketListResponse,
  type CreateBucketItemRequest,
  createBucketItemRequestSchema,
  idSchema,
  type UpdateBucketItemRequest,
  updateBucketItemRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { BucketService } from './bucket.service'

const idPipe = new ZodValidationPipe(idSchema)

@Controller('bucket')
@Authenticated()
export class BucketController {
  constructor(private readonly bucket: BucketService) {}

  @Get()
  list(@CurrentCouple() couple: CoupleContext): Promise<BucketListResponse> {
    return this.bucket.list(couple.id)
  }

  @Post()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createBucketItemRequestSchema)) body: CreateBucketItemRequest,
  ): Promise<BucketItem> {
    return this.bucket.create(couple.id, me.id, body)
  }

  @Patch(':id')
  update(
    @CurrentCouple() couple: CoupleContext,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateBucketItemRequestSchema)) body: UpdateBucketItemRequest,
  ): Promise<BucketItem> {
    return this.bucket.update(couple.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<void> {
    return this.bucket.remove(couple.id, id)
  }
}
