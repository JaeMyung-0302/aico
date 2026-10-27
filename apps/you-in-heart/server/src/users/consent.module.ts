import { Module } from '@nestjs/common'
import { ConsentService } from './consent.service'

// CoupleGuard(CouplesModule)와 /me(UsersModule)가 함께 쓴다. UsersModule → CouplesModule 순환을 피하려고 따로 둔다
@Module({
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
