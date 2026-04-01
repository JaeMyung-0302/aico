import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarketDataProvider,
  PriceDataRow,
} from './interfaces/market-data-provider.interface';

interface CacheEntry {
  prices: PriceDataRow[];
  expiry: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject('YAHOO_PROVIDER')
    private readonly yahooProvider: MarketDataProvider,
    private readonly prisma: PrismaService,
  ) {}

  async fetchAndStore(symbol: string, days = 200, interval = '1d'): Promise<PriceDataRow[]> {
    const cacheKey = `${symbol}:${interval}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.prices;
    }

    const prices = await this.yahooProvider.fetchHistorical(symbol, days, interval);

    // 일봉만 DB에 저장 (주봉/월봉은 in-memory 캐시만)
    if (interval === '1d') {
      for (const price of prices) {
        await this.prisma.priceData.upsert({
          where: {
            symbol_date: { symbol, date: price.date },
          },
          update: {
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
          },
          create: {
            symbol,
            date: price.date,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
          },
        });
      }
    }

    this.cache.set(cacheKey, {
      prices,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    this.logger.log(`Fetched and stored ${prices.length} prices for ${symbol} (${interval})`);
    return prices;
  }

  async getPrices(symbol: string): Promise<PriceDataRow[]> {
    const cached = this.cache.get(`${symbol}:1d`);
    if (cached && cached.expiry > Date.now()) {
      return cached.prices;
    }

    const dbPrices = await this.prisma.priceData.findMany({
      where: { symbol },
      orderBy: { date: 'asc' },
    });

    const prices: PriceDataRow[] = dbPrices.map((row) => ({
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: Number(row.volume),
    }));

    if (prices.length > 0) {
      this.cache.set(`${symbol}:1d`, {
        prices,
        expiry: Date.now() + CACHE_TTL_MS,
      });
    }

    return prices;
  }
}
