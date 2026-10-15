import type { AuthProvider } from '@miri-pet/shared'

// 소셜 SDK 실패(취소 제외). 화면은 message만 보여준다
export class SocialLoginError extends Error {
  readonly provider: AuthProvider

  constructor(provider: AuthProvider, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SocialLoginError'
    this.provider = provider
  }
}
