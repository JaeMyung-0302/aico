import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '../generated/prisma'

@Injectable()
export class SavesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, slot: number, data: Record<string, unknown>, version: number) {
    const existing = await this.prisma.save.findUnique({
      where: { userId_slot: { userId, slot } },
      select: { version: true },
    })

    if (existing && existing.version > version) {
      throw new ConflictException(
        `Version conflict: server=${existing.version}, client=${version}`,
      )
    }

    return this.prisma.save.upsert({
      where: { userId_slot: { userId, slot } },
      create: { userId, slot, data: data as Prisma.InputJsonValue, version },
      update: { data: data as Prisma.InputJsonValue, version },
    })
  }

  async findOne(userId: string, slot: number) {
    const save = await this.prisma.save.findUnique({
      where: { userId_slot: { userId, slot } },
    })
    if (!save) throw new NotFoundException(`Save slot ${slot} not found`)
    return save
  }

  async findAll(userId: string) {
    return this.prisma.save.findMany({
      where: { userId },
      orderBy: { slot: 'asc' },
      select: { slot: true, version: true, updatedAt: true },
    })
  }

  async remove(userId: string, slot: number) {
    const deleted = await this.prisma.save.deleteMany({
      where: { userId, slot },
    })
    if (deleted.count === 0) throw new NotFoundException(`Save slot ${slot} not found`)
  }
}
