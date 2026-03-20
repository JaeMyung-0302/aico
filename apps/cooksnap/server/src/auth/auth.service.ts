import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signToken = (userId: string, email: string): string => {
    return this.jwtService.sign({ sub: userId, email })
  }

  signUp = async (email: string, password: string) => {
    const existing = await this.prisma.user.findFirst({
      where: { provider: 'email', email },
    })
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        provider: 'email',
        providerId: email,
      },
    })

    return { token: this.signToken(user.id, user.email) }
  }

  signIn = async (email: string, password: string) => {
    const user = await this.prisma.user.findFirst({
      where: { provider: 'email', email },
    })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    return { token: this.signToken(user.id, user.email) }
  }

  handleKakaoCallback = async (code: string) => {
    const clientId = this.configService.get<string>('kakao.clientId')
    const clientSecret = this.configService.get<string>('kakao.clientSecret')
    const redirectUri = `${this.getBackendUrl()}/api/v1/auth/kakao/callback`

    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )

    const profileRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    })

    const kakaoUser = profileRes.data
    const kakaoId = String(kakaoUser.id)
    const email = kakaoUser.kakao_account?.email || `${kakaoId}@kakao.user`
    const nickname = kakaoUser.kakao_account?.profile?.nickname || null

    const user = await this.prisma.user.upsert({
      where: { provider_providerId: { provider: 'kakao', providerId: kakaoId } },
      update: { email, nickname },
      create: { email, nickname, provider: 'kakao', providerId: kakaoId },
    })

    return this.signToken(user.id, user.email)
  }

  handleGoogleCallback = async (code: string) => {
    const clientId = this.configService.get<string>('google.clientId')
    const clientSecret = this.configService.get<string>('google.clientSecret')
    const redirectUri = `${this.getBackendUrl()}/api/v1/auth/google/callback`

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    })

    const profileRes = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } },
    )

    const googleUser = profileRes.data
    const googleId = String(googleUser.id)
    const email = googleUser.email || `${googleId}@google.user`
    const nickname = googleUser.name || null

    const user = await this.prisma.user.upsert({
      where: { provider_providerId: { provider: 'google', providerId: googleId } },
      update: { email, nickname },
      create: { email, nickname, provider: 'google', providerId: googleId },
    })

    return this.signToken(user.id, user.email)
  }

  private getBackendUrl = (): string => {
    const clientOrigin = this.configService.get<string>('app.clientOrigin') || ''
    if (clientOrigin.includes('localhost')) {
      return 'http://localhost:4000'
    }
    return 'https://api.cooksnap.aico-app.com'
  }
}
