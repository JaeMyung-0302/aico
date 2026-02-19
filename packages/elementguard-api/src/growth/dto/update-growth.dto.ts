import { IsInt, Max, Min } from 'class-validator';

export class UpdateGrowthDto {
  @IsInt()
  @Min(0)
  @Max(100)
  attack_level!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  defense_level!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  economy_level!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  luck_level!: number;

  @IsInt()
  @Min(0)
  @Max(999999)
  total_invested!: number;
}
