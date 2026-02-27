import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class OptionalAuthGuard implements CanActivate {
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
    const request = context.switchToHttp().getRequest()
    request.user = null

    if (!this.supabase) return true

    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) return true

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token)
      if (error || !user) return true

      const provider = user.app_metadata?.provider || 'unknown'
      const dbUser = await this.prisma.user.upsert({
        where: {
          provider_providerId: { provider, providerId: user.id },
        },
        update: { email: user.email || '' },
        create: {
          email: user.email || '',
          nickname: user.user_metadata?.name || null,
          provider,
          providerId: user.id,
        },
      })

      request.user = dbUser
    } catch {
      // 인증 실패해도 요청은 계속 진행
    }

    return true
  }
}
