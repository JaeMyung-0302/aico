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
export class AuthGuard implements CanActivate {
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
    const token = request.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.')
    }

    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token)

    if (error || !user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.')
    }

    // users 테이블에 upsert
    const provider = user.app_metadata?.provider || 'unknown'
    const dbUser = await this.prisma.user.upsert({
      where: {
        provider_providerId: {
          provider,
          providerId: user.id,
        },
      },
      update: {
        email: user.email || '',
      },
      create: {
        email: user.email || '',
        nickname: user.user_metadata?.name || null,
        provider,
        providerId: user.id,
      },
    })

    request.user = dbUser
    return true
  }
}
