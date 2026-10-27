import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { StorageModule } from '../storage/storage.module'
import { ExportController } from './export.controller'
import { ExportManifestBuilder } from './export-manifest'
import { ExportService } from './export.service'

@Module({
  imports: [AuthModule, NotificationsModule, StorageModule],
  controllers: [ExportController],
  providers: [ExportService, ExportManifestBuilder],
})
export class ExportModule {}
