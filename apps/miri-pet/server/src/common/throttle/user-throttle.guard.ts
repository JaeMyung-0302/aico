import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { InjectThrottlerStorage, ThrottlerException, type ThrottlerStorage } from '@nestjs/throttler'
import { type ClientIpSource, resolveClientIp } from './client-ip'

export const USER_THROTTLE_KEY = 'miri:user-throttle'

// name: 라우트별 버킷 이름, ttl: 창 길이(ms), limit: 창 안에서 허용 횟수
export type UserThrottleOptions = { name: string; ttl: number; limit: number }

type TrackedRequest = ClientIpSource & { authUser?: unknown }

const userIdOf = (req: TrackedRequest): string | null => {
  const user = req.authUser
  if (typeof user !== 'object' || user === null) return null
  const id: unknown = Reflect.get(user, 'id')
  return typeof id === 'string' ? id : null
}

// 전역 ThrottlerGuard(IP 기준)는 인증 가드보다 먼저 돌아 사용자를 모른다.
// 이 가드는 메서드 레벨이라 @Authenticated() 뒤에 실행되고, 같은 ThrottlerStorage에 사용자 id 키로 센다
@Injectable()
export class UserThrottleGuard implements CanActivate {
  private readonly trustProxyHops: number

  constructor(
    private readonly reflector: Reflector,
    @InjectThrottlerStorage() private readonly storage: ThrottlerStorage,
    config: ConfigService,
  ) {
    this.trustProxyHops = config.get<number>('trustProxyHops') ?? 0
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<UserThrottleOptions | undefined>(USER_THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!options) return true
    const req = context.switchToHttp().getRequest<TrackedRequest>()
    const userId = userIdOf(req)
    const tracker = userId ? `user:${userId}` : `ip:${resolveClientIp(req, this.trustProxyHops)}`
    const { name, ttl, limit } = options
    const record = await this.storage.increment(`${name}:${tracker}`, ttl, limit, ttl, name)
    if (record.isBlocked) throw new ThrottlerException()
    return true
  }
}

// @Authenticated() 아래(메서드)에 붙인다 → 인증 뒤 사용자 id로 센다
export const UserThrottle = (options: UserThrottleOptions) =>
  applyDecorators(SetMetadata(USER_THROTTLE_KEY, options), UseGuards(UserThrottleGuard))
