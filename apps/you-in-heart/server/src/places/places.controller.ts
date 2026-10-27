import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type CreatePlaceRequest,
  createPlaceRequestSchema,
  type CursorQuery,
  cursorQuerySchema,
  type DiaryListResponse,
  idSchema,
  type Place,
  type PlaceBboxQuery,
  placeBboxQuerySchema,
  type PlaceListResponse,
  type PlaceReverseQuery,
  placeReverseQuerySchema,
  type PlaceReverseResponse,
  type PlaceSearchQuery,
  placeSearchQuerySchema,
  type PlaceSearchResponse,
  type UpdatePlaceRequest,
  updatePlaceRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { RequiresLocationConsent } from '../users/decorators/requires-location-consent.decorator'
import { PlacesService } from './places.service'

const idPipe = new ZodValidationPipe(idSchema)

// 카카오 로컬 프록시: search·reverse 합산 사용자당 30회/분(plan 2A.2). 넘으면 429 RATE_LIMITED
const KAKAO_LOCAL_THROTTLE = { name: 'kakao-local', ttl: 60_000, limit: 30 }

// 핀 좌표를 주고받는 라우트는 위치 동의(LOCATION) 필수. 핀 삭제와 핀의 일기 목록(좌표 없음)은 동의 없이도 된다.
// search·reverse는 :id보다 먼저 선언한다
@Controller('places')
@Authenticated()
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  @RequiresLocationConsent()
  list(
    @CurrentCouple() couple: CoupleContext,
    @Query(new ZodValidationPipe(placeBboxQuerySchema)) query: PlaceBboxQuery,
  ): Promise<PlaceListResponse> {
    return this.places.list(couple.id, query)
  }

  @Get('search')
  @RequiresLocationConsent()
  @UserThrottle(KAKAO_LOCAL_THROTTLE)
  search(@Query(new ZodValidationPipe(placeSearchQuerySchema)) { q }: PlaceSearchQuery): Promise<PlaceSearchResponse> {
    return this.places.search(q)
  }

  @Get('reverse')
  @RequiresLocationConsent()
  @UserThrottle(KAKAO_LOCAL_THROTTLE)
  reverse(
    @Query(new ZodValidationPipe(placeReverseQuerySchema)) query: PlaceReverseQuery,
  ): Promise<PlaceReverseResponse> {
    return this.places.reverse(query)
  }

  @Post()
  @RequiresLocationConsent()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPlaceRequestSchema)) body: CreatePlaceRequest,
  ): Promise<Place> {
    return this.places.create(couple.id, me.id, body)
  }

  @Get(':id')
  @RequiresLocationConsent()
  get(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<Place> {
    return this.places.get(couple.id, id)
  }

  @Patch(':id')
  @RequiresLocationConsent()
  update(
    @CurrentCouple() couple: CoupleContext,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updatePlaceRequestSchema)) body: UpdatePlaceRequest,
  ): Promise<Place> {
    return this.places.update(couple.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<void> {
    return this.places.remove(couple.id, id)
  }

  @Get(':id/entries')
  entries(
    @CurrentCouple() couple: CoupleContext,
    @Param('id', idPipe) id: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<DiaryListResponse> {
    return this.places.entries(couple.id, id, query)
  }
}
