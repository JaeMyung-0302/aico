import { type CanActivate, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// 비활성 상태·ADMIN 계정 모두 없는 라우트와 같은 404를 돌려준다
export const devLoginNotFound = (): NotFoundException => new NotFoundException('Cannot POST /api/v1/auth/dev')

// /auth/dev는 NODE_ENV!=='production' && ENABLE_DEV_LOGIN==='true'일 때만 존재한다. 아니면 없는 라우트와 같은 404
@Injectable()
export class DevLoginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get<boolean>('isDevLoginEnabled') === true) return true
    throw devLoginNotFound()
  }
}
