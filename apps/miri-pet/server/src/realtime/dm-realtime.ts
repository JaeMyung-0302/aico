import { Injectable, Logger } from '@nestjs/common'

type Disconnector = (userId: string) => void

// 보안 리뷰 LOW-1: 로그아웃·정지·탈퇴 시 열린 DM 소켓을 끊는다.
// 세션·모더레이션·탈퇴 서비스가 DmGateway(DmModule)를 직접 의존하면 모듈 순환이 생기므로,
// AuthModule이 이 작은 facade를 제공하고 DmGateway가 afterInit에서 실제 끊기 함수를 등록한다.
// 게이트웨이가 없는 컨텍스트(운영자 CLI)에서는 no-op → 소켓은 access token 만료(exp) 시각에 끊긴다
@Injectable()
export class DmRealtime {
  private readonly logger = new Logger(DmRealtime.name)
  private disconnector: Disconnector | null = null

  register(disconnector: Disconnector): void {
    this.disconnector = disconnector
  }

  disconnectUser(userId: string): void {
    try {
      this.disconnector?.(userId)
    } catch (error) {
      this.logger.warn(`[dm] disconnect ${userId} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
