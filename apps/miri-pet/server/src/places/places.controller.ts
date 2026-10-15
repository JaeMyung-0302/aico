import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import {
  type CreatePlaceReportRequest,
  createPlaceReportRequestSchema,
  idSchema,
  type MyPlaceReport,
  type Place,
  type PlaceBboxQuery,
  placeBboxQuerySchema,
  type PlaceList,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { PlaceReportsService } from './place-reports.service'
import { PlacesService } from './places.service'

// 장소 제보: 사용자당 시간당 10건 (운영자 검수 큐 스팸 방지)
export const PLACE_REPORT_THROTTLE = { ttl: 60 * 60 * 1000, limit: 10 }

// 서버는 기기 좌표를 받지 않는다 — 지도 화면의 bbox만 받는다 (D4)
@Controller()
@Authenticated()
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly reports: PlaceReportsService,
  ) {}

  @Get('places')
  list(@Query(new ZodValidationPipe(placeBboxQuerySchema)) query: PlaceBboxQuery): Promise<PlaceList> {
    return this.places.list(query)
  }

  @Get('places/:placeId')
  get(@Param('placeId', new ZodValidationPipe(idSchema)) placeId: string): Promise<Place> {
    return this.places.get(placeId)
  }

  @Post('places/reports')
  @UserThrottle({ name: 'place-reports', ...PLACE_REPORT_THROTTLE })
  report(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPlaceReportRequestSchema)) body: CreatePlaceReportRequest,
  ): Promise<{ id: string; status: 'PENDING' }> {
    return this.reports.create(me.id, body)
  }

  @Get('me/place-reports')
  myReports(@CurrentUser() me: AuthUser): Promise<{ items: MyPlaceReport[] }> {
    return this.reports.listMine(me.id)
  }
}
