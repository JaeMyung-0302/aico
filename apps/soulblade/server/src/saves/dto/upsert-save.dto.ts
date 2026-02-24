import { IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpsertSaveDto {
  @IsObject()
  saveData!: Prisma.InputJsonValue;
}
