import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { PremiumService } from '../premium.service'

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly premiumService: PremiumService) {}

  canActivate = (context: ExecutionContext): boolean => {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.')
    }

    if (!this.premiumService.isPremiumActive(user)) {
      throw new ForbiddenException('프리미엄 기능입니다.')
    }

    return true
  }
}
