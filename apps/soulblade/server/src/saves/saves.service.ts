import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SavesService {
  constructor(private readonly prisma: PrismaService) {}

  loadSave = async (userId: string) => {
    const save = await this.prisma.rpgSave.findUnique({
      where: { userId },
      select: { saveData: true, updatedAt: true },
    })

    return save ?? { saveData: {}, updatedAt: null }
  }

  upsertSave = async (userId: string, saveData: Prisma.InputJsonValue) => {
    return this.prisma.rpgSave.upsert({
      where: { userId },
      update: { saveData },
      create: { userId, saveData },
      select: { id: true, updatedAt: true },
    })
  }
}
