import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ConfigController } from '../config/config.controller'
import { MediaModule } from '../media/media.module'
import { PlaceImportService } from './import/place-import.service'
import { PlaceReportReviewService } from './place-report-review.service'
import { PlaceReportsService } from './place-reports.service'
import { PlacesController } from './places.controller'
import { PlacesRepository } from './places.repository'
import { PlacesService } from './places.service'

// GET /config는 GPS 플래그(장소 탭 전용)뿐이라 app.module을 건드리지 않고 여기에 둔다
@Module({
  imports: [AuthModule, MediaModule],
  controllers: [PlacesController, ConfigController],
  providers: [PlacesRepository, PlacesService, PlaceReportsService, PlaceReportReviewService, PlaceImportService],
  exports: [PlaceReportReviewService, PlaceImportService],
})
export class PlacesModule {}
