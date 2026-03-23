import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { YahooProvider } from './providers/yahoo.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MarketDataService,
    {
      provide: 'YAHOO_PROVIDER',
      useFactory: (config: ConfigService) => {
        const timeout = config.get<number>('yahoo.timeout', 10000);
        return new YahooProvider(timeout);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
