import { Injectable, NotFoundException } from '@nestjs/common'
import type { MeResponse, UpdateMeRequest } from '@you-in-heart/shared'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'

const notFound = () => new NotFoundException('사용자를 찾을 수 없어요')

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentService,
  ) {}

  // TODO(0E): couple 요약을 CoupleMember에서 채운다
  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true },
    })
    if (!user) throw notFound()
    const consents = await this.consents.status(userId)
    return { id: user.id, displayName: user.displayName, consents, couple: null }
  }

  async updateMe(userId: string, body: UpdateMeRequest): Promise<MeResponse> {
    await this.prisma.user.update({ where: { id: userId }, data: { displayName: body.displayName } })
    return this.getMe(userId)
  }
}
