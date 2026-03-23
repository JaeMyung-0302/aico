import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    const token = await this.generateToken(user.id, user.email, user.plan);
    return { token, user: { id: user.id, email: user.email, plan: user.plan } };
  }

  async signin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const token = await this.generateToken(user.id, user.email, user.plan);
    return { token, user: { id: user.id, email: user.email, plan: user.plan } };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true, plan: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }
    return user;
  }

  private async generateToken(id: number, email: string, plan: string) {
    return this.jwtService.signAsync({ sub: id, email, plan });
  }
}
