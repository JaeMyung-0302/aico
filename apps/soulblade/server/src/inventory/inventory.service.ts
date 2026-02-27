import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll = async (userId: string) => {
    return this.prisma.equipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  equipItem = async (userId: string, itemId: string, characterId: string) => {
    const item = await this.prisma.equipment.findFirst({
      where: { id: itemId, userId },
    })

    if (!item) {
      throw new NotFoundException('Equipment not found')
    }

    // 캐릭터 소유권 확인
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, userId },
    })

    if (!character) {
      throw new ForbiddenException('Character not found or not owned')
    }

    // 트랜잭션: 같은 타입 기존 장착 해제 + 새 장비 장착
    return this.prisma.$transaction(async (tx) => {
      // 같은 캐릭터의 같은 타입 장비 해제
      await tx.equipment.updateMany({
        where: { equippedBy: characterId, type: item.type },
        data: { equippedBy: null },
      })

      return tx.equipment.update({
        where: { id: itemId },
        data: { equippedBy: characterId },
      })
    })
  }

  unequipItem = async (userId: string, itemId: string) => {
    const item = await this.prisma.equipment.findFirst({
      where: { id: itemId, userId },
    })

    if (!item) {
      throw new NotFoundException('Equipment not found')
    }

    return this.prisma.equipment.update({
      where: { id: itemId },
      data: { equippedBy: null },
    })
  }

  sellItem = async (userId: string, itemId: string) => {
    const item = await this.prisma.equipment.findFirst({
      where: { id: itemId, userId },
    })

    if (!item) {
      throw new NotFoundException('Equipment not found')
    }

    if (item.equippedBy) {
      throw new BadRequestException('Cannot sell equipped item. Unequip first.')
    }

    await this.prisma.equipment.delete({
      where: { id: itemId },
    })

    return { deleted: true }
  }
}
