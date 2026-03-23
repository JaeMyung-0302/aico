-- AlterTable
ALTER TABLE "users" ADD COLUMN     "push_subscription" TEXT;

-- CreateTable
CREATE TABLE "signal_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "traded_at" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "ta_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signal_logs_user_id_created_at_idx" ON "signal_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "signal_logs_user_id_symbol_type_idx" ON "signal_logs"("user_id", "symbol", "type");

-- CreateIndex
CREATE UNIQUE INDEX "alert_preferences_user_id_symbol_key" ON "alert_preferences"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "trade_logs_user_id_traded_at_idx" ON "trade_logs"("user_id", "traded_at");

-- AddForeignKey
ALTER TABLE "signal_logs" ADD CONSTRAINT "signal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_preferences" ADD CONSTRAINT "alert_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_logs" ADD CONSTRAINT "trade_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
