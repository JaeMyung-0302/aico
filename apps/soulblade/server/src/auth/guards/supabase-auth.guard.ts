import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.configService.get<string>('supabase.url')
    const key = this.configService.get<string>('supabase.serviceRoleKey')
    if (url && key) {
      this.supabase = createClient(url, key)
    }
  }

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    if (!this.supabase) {
      throw new UnauthorizedException('인증 서비스가 설정되지 않았습니다.')
    }

    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.')
    }

    const token = authHeader.slice(7)

    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token)

    if (error || !user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.')
    }

    // 운영: Supabase auth 트리거가 profile 자동 생성
    // 개발: Docker DB에는 트리거가 없으므로 upsert로 보완
    if (process.env.NODE_ENV !== 'production') {
      try {
        await this.prisma.profile.upsert({
          where: { id: user.id },
          update: {},
          create: { id: user.id, displayName: user.email ?? 'dev-user' },
        })
      } catch {
        // 개발 환경 프로필 자동 생성 실패 시 인증 흐름은 유지
      }
    }

    request.user = { id: user.id, email: user.email }
    return true
  }
}
