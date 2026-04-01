import { IsString, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalysisQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  period?: number = 200;

  @IsOptional()
  @IsIn(['1d', '1wk', '1mo'])
  interval?: '1d' | '1wk' | '1mo' = '1d';
}

export class SearchQueryDto {
  @IsString()
  q!: string;
}
