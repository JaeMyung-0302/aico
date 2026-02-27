import { Module } from '@nestjs/common'
import { PortoneService } from './portone.service'

@Module({
  providers: [PortoneService],
  exports: [PortoneService],
})
export class PortoneModule {}
