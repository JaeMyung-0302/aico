import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import {
  MarketDataProvider,
  PriceDataRow,
} from '../interfaces/market-data-provider.interface';

@Injectable()
export class YahooProvider implements MarketDataProvider {
  private readonly logger = new Logger(YahooProvider.name);
  private readonly maxRetries = 3;
  private readonly yahooFinance: InstanceType<typeof YahooFinance>;

  constructor(private readonly timeout: number = 10000) {
    this.yahooFinance = new YahooFinance();
  }

  async fetchHistorical(symbol: string, days: number, interval: string = '1d'): Promise<PriceDataRow[]> {
    const adjustedDays = interval === '1mo' ? Math.max(days, 1095) : interval === '1wk' ? Math.max(days, 365) : days;
    const period1 = new Date();
    period1.setDate(period1.getDate() - adjustedDays);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.yahooFinance.chart(symbol, {
          period1,
          interval: interval as '1d' | '1wk' | '1mo',
        });

        const quotes = result.quotes;
        if (!quotes || quotes.length === 0) {
          throw new Error('No data returned from Yahoo Finance');
        }

        return quotes
          .filter((row) => row.close != null && row.open != null)
          .map((row) => ({
            date: row.date,
            open: row.open!,
            high: row.high!,
            low: row.low!,
            close: row.close!,
            volume: row.volume ?? 0,
          }));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Yahoo Finance fetch failed for ${symbol} (attempt ${attempt}/${this.maxRetries}): ${lastError.message}`,
        );

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
