import { Module } from '@nestjs/common'
import { KamisService } from './kamis.service'

@Module({
  providers: [KamisService],
  exports: [KamisService],
})
export class KamisModule {}
