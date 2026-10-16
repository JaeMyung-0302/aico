import { Injectable, NotFoundException } from '@nestjs/common'
import { SessionService } from '../auth/session.service'
import { PrismaService } from '../prisma/prisma.service'

// 운영자 이용 정지: 상태 변경 + 세션 전부 폐기 → JwtAuthGuard가 다음 요청부터 401
@Injectable()
export class UserSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async suspend(userId: string): Promise<void> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    })
    if (count === 0) throw new NotFoundException(`ACTIVE 사용자 ${userId}를 찾을 수 없습니다`)
    await this.sessions.revokeAll(userId)
  }
}
