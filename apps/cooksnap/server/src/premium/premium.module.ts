import { Global, Module } from '@nestjs/common'
import { PremiumService } from './premium.service'
import { PremiumGuard } from './guards/premium.guard'

@Global()
@Module({
  providers: [PremiumService, PremiumGuard],
  exports: [PremiumService, PremiumGuard],
})
export class PremiumModule {}
