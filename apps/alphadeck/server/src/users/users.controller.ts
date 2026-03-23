import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUser(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body('nickname') nickname: string,
  ) {
    return this.usersService.updateNickname(req.user.id, nickname);
  }
}
