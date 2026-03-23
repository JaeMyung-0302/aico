import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalysisQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  period?: number = 200;
}

export class SearchQueryDto {
  @IsString()
  q!: string;
}
