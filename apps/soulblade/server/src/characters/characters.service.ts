import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertCharacterDto } from './dto/upsert-character.dto'

const VALID_CLASS_TYPES = ['Warrior', 'Archer', 'Mage', 'Paladin'] as const

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll = async (userId: string) => {
    return this.prisma.character.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
  }

  findByClassType = async (userId: string, classType: string) => {
    if (
      !VALID_CLASS_TYPES.includes(
        classType as (typeof VALID_CLASS_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Invalid class type')
    }

    const character = await this.prisma.character.findFirst({
      where: { userId, classType },
    })

    if (!character) {
      throw new NotFoundException('Character not found')
    }

    return character
  }

  upsert = async (
    userId: string,
    classType: string,
    dto: UpsertCharacterDto,
  ) => {
    if (
      !VALID_CLASS_TYPES.includes(
        classType as (typeof VALID_CLASS_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Invalid class type')
    }

    const data = {
      ...(dto.permanentHp !== undefined && { permanentHp: dto.permanentHp }),
      ...(dto.permanentAtk !== undefined && { permanentAtk: dto.permanentAtk }),
      ...(dto.permanentDef !== undefined && { permanentDef: dto.permanentDef }),
      ...(dto.permanentSpd !== undefined && { permanentSpd: dto.permanentSpd }),
      ...(dto.permanentCrit !== undefined && {
        permanentCrit: dto.permanentCrit,
      }),
      ...(dto.masteryLevel !== undefined && { masteryLevel: dto.masteryLevel }),
      ...(dto.masteryExp !== undefined && { masteryExp: dto.masteryExp }),
    }

    return this.prisma.character.upsert({
      where: { userId_classType: { userId, classType } },
      update: data,
      create: { userId, classType, ...data },
    })
  }
}
