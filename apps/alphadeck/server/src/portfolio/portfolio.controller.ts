import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { AddItemDto } from './dto/add-item.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';

@Controller('portfolios')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolios(@Req() req: AuthenticatedRequest) {
    return this.portfolioService.getPortfolios(req.user.id);
  }

  @Post()
  createPortfolio(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.portfolioService.createPortfolio(
      req.user.id,
      dto.name ?? '기본 포트폴리오',
    );
  }

  @Post(':id/items')
  addItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) portfolioId: number,
    @Body() dto: AddItemDto,
  ) {
    return this.portfolioService.addItem(
      req.user.id,
      portfolioId,
      dto.symbol,
      dto.quantity,
      dto.avgBuyPrice,
    );
  }

  @Delete(':portfolioId/items/:itemId')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.portfolioService.removeItem(req.user.id, portfolioId, itemId);
  }
}
