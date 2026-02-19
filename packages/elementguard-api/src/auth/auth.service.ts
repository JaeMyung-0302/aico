import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('이미 등록된 이메일입니다');
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        isGuest: false,
        profile: {
          create: { displayName: 'Player', isGuest: false },
        },
      },
    });

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async guest(): Promise<TokenPair> {
    const user = await this.prisma.user.create({
      data: {
        isGuest: true,
        profile: {
          create: { displayName: 'Guest', isGuest: true },
        },
      },
    });

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(userId: string): Promise<TokenPair> {
    const payload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
        algorithm: 'HS256',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
        algorithm: 'HS256',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash, lastActiveAt: new Date() },
    });
  }
}
