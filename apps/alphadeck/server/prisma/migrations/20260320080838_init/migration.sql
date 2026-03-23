-- CreateTable
CREATE TABLE "price_data" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ta_results" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sma_20" DOUBLE PRECISION,
    "sma_50" DOUBLE PRECISION,
    "sma_200" DOUBLE PRECISION,
    "ema_12" DOUBLE PRECISION,
    "ema_26" DOUBLE PRECISION,
    "rsi_14" DOUBLE PRECISION,
    "macd_line" DOUBLE PRECISION,
    "macd_signal" DOUBLE PRECISION,
    "macd_histogram" DOUBLE PRECISION,
    "bb_upper" DOUBLE PRECISION,
    "bb_middle" DOUBLE PRECISION,
    "bb_lower" DOUBLE PRECISION,
    "volume_ratio" DOUBLE PRECISION,
    "composite_score" DOUBLE PRECISION,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ta_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_data_symbol_idx" ON "price_data"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "price_data_symbol_date_key" ON "price_data"("symbol", "date");

-- CreateIndex
CREATE INDEX "ta_results_symbol_idx" ON "ta_results"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "ta_results_symbol_date_key" ON "ta_results"("symbol", "date");
