import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  // Supabase Auth가 OAuth 플로우를 처리하므로
  // 백엔드에서는 토큰 검증만 수행 (AuthGuard에서 처리)
}
