import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  signToken = (userId: string, email: string): string => {
    return this.jwtService.sign({ sub: userId, email })
  }

  signUp = async (email: string, password: string, name?: string) => {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    })

    return { token: this.signToken(user.id, user.email) }
  }

  signIn = async (email: string, password: string) => {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    return { token: this.signToken(user.id, user.email) }
  }
}
