import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest()
    request.user = null

    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) return true

    try {
      const payload = this.jwtService.verify(token)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })
      request.user = user
    } catch {
      // 인증 실패해도 요청은 계속 진행
    }

    return true
  }
}
