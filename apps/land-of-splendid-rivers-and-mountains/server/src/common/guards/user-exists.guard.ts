import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const CUID_REGEX = /^c[a-z0-9]{24}$/
const CACHE_TTL_MS = 60_000
const CACHE_MAX_SIZE = 200

@Injectable()
export class UserExistsGuard implements CanActivate {
  private readonly cache = new Map<string, number>()

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
    const userId = request.headers['x-user-id']

    if (!userId) throw new BadRequestException('x-user-id header required')
    if (!CUID_REGEX.test(userId)) throw new BadRequestException('Invalid x-user-id format')

    const cachedAt = this.cache.get(userId)
    if (cachedAt !== undefined && Date.now() - cachedAt < CACHE_TTL_MS) {
      return true
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new UnauthorizedException('User not found')

    if (this.cache.size >= CACHE_MAX_SIZE) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(userId, Date.now())

    return true
  }
}
