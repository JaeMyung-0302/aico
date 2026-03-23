import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, nickname: true, plan: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    return user;
  }

  async updateNickname(id: number, nickname: string) {
    return this.prisma.user.update({
      where: { id },
      data: { nickname },
      select: { id: true, email: true, nickname: true, plan: true },
    });
  }
}
