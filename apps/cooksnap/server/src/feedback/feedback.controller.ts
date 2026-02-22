import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import type { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, dto);
  }

  @Get('admin')
  @UseGuards(AuthGuard, AdminGuard)
  findAll(@Query() query: FeedbackQueryDto) {
    return this.feedbackService.findAll(query);
  }

  @Patch('admin/:id/status')
  @UseGuards(AuthGuard, AdminGuard)
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFeedbackStatusDto) {
    return this.feedbackService.updateStatus(id, dto.status);
  }
}
