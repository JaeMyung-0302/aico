import { IsString, IsNumber, Min } from 'class-validator';

export class AddItemDto {
  @IsString()
  symbol!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0.01)
  avgBuyPrice!: number;
}
