import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.')
    }
    const token = authHeader.slice(7)

    let payload: { sub: string }
    try {
      payload = this.jwtService.verify(token)
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.')
    }

    request.user = user
    return true
  }
}
