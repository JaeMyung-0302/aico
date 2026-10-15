import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ConsentGuard } from './guards/consent.guard'
import { DevLoginGuard } from './guards/dev-login.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { createRemoteJwksResolver, IdTokenVerifier, JWKS_RESOLVER } from './id-token-verifier'
import { DmRealtime } from '../realtime/dm-realtime'
import { SessionService } from './session.service'

// HS256 키는 해시 출력(32바이트) 이상이어야 무차별 대입에 안전하다
export const JWT_MIN_SECRET_BYTES = 32

export const resolveJwtOptions = (config: ConfigService): JwtModuleOptions => {
  const secret = config.get<string>('jwtSecret') ?? ''
  if (!secret) throw new Error('JWT_SECRET 환경변수가 필요합니다')
  if (Buffer.byteLength(secret, 'utf8') < JWT_MIN_SECRET_BYTES) {
    throw new Error(`JWT_SECRET은 ${JWT_MIN_SECRET_BYTES}바이트 이상이어야 합니다 (예: openssl rand -base64 48)`)
  }
  return { secret, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } }
}

// 이후 Phase는 AuthModule을 import하고 @Authenticated()(JwtAuthGuard + ConsentGuard) + @CurrentUser()를 쓴다
@Module({
  imports: [JwtModule.registerAsync({ inject: [ConfigService], useFactory: resolveJwtOptions })],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    IdTokenVerifier,
    DevLoginGuard,
    JwtAuthGuard,
    ConsentGuard,
    { provide: JWKS_RESOLVER, useFactory: createRemoteJwksResolver },
    DmRealtime,
  ],
  // DmRealtime: 세션·정지·탈퇴 쪽이 DM 소켓을 끊는 통로(DmGateway가 등록). AuthModule은 싱글턴이라 모두 같은 인스턴스
  exports: [SessionService, JwtAuthGuard, ConsentGuard, DmRealtime],
})
export class AuthModule {}
