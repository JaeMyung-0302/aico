import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import {
  type CreatePhotoUploadRequest,
  createPhotoUploadRequestSchema,
  type CreatePhotoUploadResponse,
  type CursorPage,
  type CursorQuery,
  cursorQuerySchema,
  idSchema,
  type Photo,
  type PhotoOriginalResponse,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { PhotosService } from './photos.service'

const idPipe = new ZodValidationPipe(idSchema)

// 좌표는 업로드 요청에서만 받고 응답에는 돌려주지 않는다. 위치 동의는 좌표가 있을 때만 서비스가 검사한다
@Controller('photos')
@Authenticated()
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  list(
    @CurrentCouple() couple: CoupleContext,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<CursorPage<Photo>> {
    return this.photos.list(couple.id, query)
  }

  @Post('uploads')
  createUpload(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPhotoUploadRequestSchema)) body: CreatePhotoUploadRequest,
  ): Promise<CreatePhotoUploadResponse> {
    return this.photos.createUpload(couple.id, me.id, body)
  }

  @Get(':id')
  get(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<Photo> {
    return this.photos.get(couple.id, id)
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<Photo> {
    return this.photos.complete(couple.id, id)
  }

  @Post(':id/uploads/renew')
  @HttpCode(HttpStatus.OK)
  renewUpload(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
  ): Promise<CreatePhotoUploadResponse> {
    return this.photos.renewUpload(couple.id, me.id, id)
  }

  @Get(':id/original')
  original(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<PhotoOriginalResponse> {
    return this.photos.originalUrl(couple.id, id)
  }
}
