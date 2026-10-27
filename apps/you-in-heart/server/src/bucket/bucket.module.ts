import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BucketController } from './bucket.controller'
import { BucketService } from './bucket.service'

@Module({
  imports: [AuthModule],
  controllers: [BucketController],
  providers: [BucketService],
})
export class BucketModule {}
