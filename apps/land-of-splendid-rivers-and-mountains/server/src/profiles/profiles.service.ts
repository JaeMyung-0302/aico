import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string) {
    return this.prisma.user.create({ data: { name } })
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!user) throw new NotFoundException(`Profile ${id} not found`)
    return user
  }
}
