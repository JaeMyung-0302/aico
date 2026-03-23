import { IsString, IsOptional } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @IsOptional()
  name?: string = '기본 포트폴리오';
}
