import { IsObject } from 'class-validator'
import { Prisma } from '../../generated/prisma'

export class UpsertSaveDto {
  @IsObject()
  saveData!: Prisma.InputJsonValue
}
