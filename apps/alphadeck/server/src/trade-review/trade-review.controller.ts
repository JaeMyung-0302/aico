import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { TradeReviewService } from './trade-review.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';
import { CreateTradeDto } from './dto/create-trade.dto';

@Controller('trades')
@UseGuards(AuthGuard)
export class TradeReviewController {
  constructor(private readonly tradeReviewService: TradeReviewService) {}

  @Post()
  createTrade(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTradeDto,
  ) {
    return this.tradeReviewService.createTrade(req.user.id, dto);
  }

  @Get()
  getTrades(@Req() req: AuthenticatedRequest) {
    return this.tradeReviewService.getTrades(req.user.id);
  }

  @Delete(':id')
  deleteTrade(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tradeReviewService.deleteTrade(req.user.id, id);
  }

  @Post('review')
  generateReview(@Req() req: AuthenticatedRequest) {
    return this.tradeReviewService.generateReview(req.user.id);
  }
}
