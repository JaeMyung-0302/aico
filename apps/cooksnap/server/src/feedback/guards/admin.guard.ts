import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate = (context: ExecutionContext): boolean => {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.')
    }

    const adminEmails = this.configService.get<string>('admin.emails')
    if (!adminEmails) {
      throw new ForbiddenException('관리자 설정이 되어있지 않습니다.')
    }
    const allowedEmails = adminEmails
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)

    if (!allowedEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('관리자 권한이 필요합니다.')
    }

    return true
  }
}
