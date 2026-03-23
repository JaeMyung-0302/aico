import { IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

export class CreateTradeDto {
  @IsString()
  symbol!: string;

  @IsEnum(TradeAction)
  action!: TradeAction;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  price!: number;

  @IsDateString()
  tradedAt!: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
