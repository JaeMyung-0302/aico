import { IsInt, Min, Max, IsOptional } from 'class-validator'

export class UpsertCharacterDto {
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  permanentHp?: number

  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  permanentAtk?: number

  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  permanentDef?: number

  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  permanentSpd?: number

  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  permanentCrit?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  masteryLevel?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  masteryExp?: number
}
