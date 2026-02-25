import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RenewalService } from './renewal.service';
import { PortoneModule } from '../portone/portone.module';

@Module({
  imports: [PortoneModule],
  controllers: [PaymentController],
  providers: [PaymentService, RenewalService],
})
export class PaymentModule {}
