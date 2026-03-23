import { Injectable, Logger } from '@nestjs/common';
import {
  MarketDataProvider,
  PriceDataRow,
} from '../interfaces/market-data-provider.interface';

@Injectable()
export class AlphaVantageProvider implements MarketDataProvider {
  private readonly logger = new Logger(AlphaVantageProvider.name);

  async fetchHistorical(
    symbol: string,
    days: number,
  ): Promise<PriceDataRow[]> {
    this.logger.warn(
      `Alpha Vantage fallback called for ${symbol} — not yet implemented`,
    );
    throw new Error('Alpha Vantage provider not implemented. Yahoo Finance fallback only.');
  }
}
