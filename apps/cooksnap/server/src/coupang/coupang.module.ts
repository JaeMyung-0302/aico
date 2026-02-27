import { Module } from '@nestjs/common'
import { CoupangService } from './coupang.service'

@Module({
  providers: [CoupangService],
  exports: [CoupangService],
})
export class CoupangModule {}
