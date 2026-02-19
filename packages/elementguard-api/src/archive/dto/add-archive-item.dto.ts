import { IsIn, IsString, MaxLength } from 'class-validator';

export class AddArchiveItemDto {
  @IsString()
  @IsIn(['unit', 'fusion', 'artifact'])
  item_type!: 'unit' | 'fusion' | 'artifact';

  @IsString()
  @MaxLength(50)
  item_id!: string;
}
