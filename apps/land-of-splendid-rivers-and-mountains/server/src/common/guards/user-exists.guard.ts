import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const CUID_REGEX = /^c[a-z0-9]{24}$/

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
    const userId = request.headers['x-user-id']

    if (!userId) throw new BadRequestException('x-user-id header required')
    if (!CUID_REGEX.test(userId)) throw new BadRequestException('Invalid x-user-id format')

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new UnauthorizedException('User not found')

    return true
  }
}
