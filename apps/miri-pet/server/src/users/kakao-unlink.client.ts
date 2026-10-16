import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export const KAKAO_UNLINK_URL = 'https://kapi.kakao.com/v1/user/unlink'

// 탈퇴 시 카카오 앱 연결 끊기. id_token의 sub = 카카오 회원번호 → Admin 키로 user_id 지정 호출
@Injectable()
export class KakaoUnlinkClient {
  constructor(private readonly config: ConfigService) {}

  async unlink(kakaoUserId: string): Promise<void> {
    const adminKey = this.config.get<string>('kakao.adminKey') ?? ''
    if (!adminKey) throw new Error('KAKAO_ADMIN_KEY가 설정되지 않아 카카오 unlink를 건너뜁니다')
    const response = await fetch(KAKAO_UNLINK_URL, {
      method: 'POST',
      headers: { Authorization: `KakaoAK ${adminKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakaoUserId }),
    })
    if (!response.ok) throw new Error(`카카오 unlink 실패: HTTP ${response.status}`)
  }
}
