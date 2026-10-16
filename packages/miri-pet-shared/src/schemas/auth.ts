import { z } from 'zod'

// v1 로그인 제공자: 카카오 + Google (Apple은 v1 제외 — iOS 스토어 제출 전 재도입 필요)
export const authProviderSchema = z.enum(['KAKAO', 'GOOGLE'])
export type AuthProvider = z.infer<typeof authProviderSchema>

export const socialLoginRequestSchema = z.object({
  idToken: z.string().min(1),
  deviceLabel: z.string().max(100).optional(),
})
export type SocialLoginRequest = z.infer<typeof socialLoginRequestSchema>

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshRequest = z.infer<typeof refreshRequestSchema>

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
  isNewUser: z.boolean(),
})
export type AuthTokens = z.infer<typeof authTokensSchema>

export const devLoginRequestSchema = z.object({
  nickname: z.string().min(2).max(20),
})
export type DevLoginRequest = z.infer<typeof devLoginRequestSchema>
