import { IsString, IsArray, ValidateNested, IsOptional, MinLength } from 'class-validator'
import { Type } from 'class-transformer'

class ChecklistItemDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class CreateChecklistDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[]
}
