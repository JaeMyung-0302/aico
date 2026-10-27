import { z } from 'zod'

// v1 로그인 제공자: 카카오만. Apple은 공개 직전 enum에 추가(아키텍처 §4.2)
export const authProviderSchema = z.enum(['KAKAO'])
export type AuthProvider = z.infer<typeof authProviderSchema>

// POST /auth/:provider 경로 파라미터(소문자). 'apple' 등은 400
export const authProviderParamSchema = z.enum(['kakao'])
export type AuthProviderParam = z.infer<typeof authProviderParamSchema>

// 카카오 access token은 보내지 않는다(id_token만)
export const socialLoginRequestSchema = z.object({
  idToken: z.string().min(1),
  deviceLabel: z.string().max(100).optional(),
})
export type SocialLoginRequest = z.infer<typeof socialLoginRequestSchema>

// POST /auth/refresh, POST /auth/logout
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

// POST /auth/dev-login (DEV_LOGIN_ENABLED && NODE_ENV !== production 에서만). 같은 devKey면 같은 사용자
export const devLoginRequestSchema = z.object({
  devKey: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/),
})
export type DevLoginRequest = z.infer<typeof devLoginRequestSchema>
