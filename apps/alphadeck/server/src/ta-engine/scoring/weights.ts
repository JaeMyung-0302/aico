export const INDICATOR_WEIGHTS = {
  RSI: 0.25,
  MACD: 0.25,
  BollingerBands: 0.20,
  SMA: 0.15,
  Volume: 0.15,
} as const;

export const INDICATOR_WEIGHTS_V2 = {
  RSI: 0.20,
  MACD: 0.20,
  BollingerBands: 0.15,
  SMA: 0.12,
  Volume: 0.12,
  ATR: 0.05,
  OBV: 0.05,
  Stochastic: 0.06,
  ADX: 0.05,
} as const;
