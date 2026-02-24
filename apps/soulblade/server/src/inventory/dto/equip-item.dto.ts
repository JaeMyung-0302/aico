import { IsString, IsNotEmpty } from 'class-validator';

export class EquipItemDto {
  @IsString()
  @IsNotEmpty()
  characterId!: string;
}
