import {
  Body,
  Controller,
  Get,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GrowthService } from './growth.service';
import { UpdateGrowthDto } from './dto/update-growth.dto';

@Controller('growth')
@UseGuards(JwtAuthGuard)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('me')
  async getMe(@Request() req: { user: { userId: string } }) {
    return this.growthService.getGrowthTree(req.user.userId);
  }

  @Put('me')
  async updateMe(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateGrowthDto,
  ) {
    return this.growthService.updateGrowthTree(req.user.userId, dto);
  }
}
