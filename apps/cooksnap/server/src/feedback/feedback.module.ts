import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, AdminGuard],
  exports: [FeedbackService],
})
export class FeedbackModule {}
