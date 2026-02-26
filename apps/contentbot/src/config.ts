import dotenv from "dotenv";
import type { ContentBotConfig } from "./types/index.js";

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optionalEnv = (key: string, defaultValue: string): string => {
  return process.env[key] ?? defaultValue;
};

export const loadConfig = (): ContentBotConfig => {
  return {
    naver: {
      clientId: requireEnv("NAVER_CLIENT_ID"),
      clientSecret: requireEnv("NAVER_CLIENT_SECRET"),
    },
    wordpress: {
      siteId: requireEnv("WORDPRESS_SITE_ID"),
      accessToken: requireEnv("WORDPRESS_ACCESS_TOKEN"),
    },
    anthropic: {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
    },
    telegram: {
      botToken: optionalEnv("TELEGRAM_BOT_TOKEN", ""),
      chatId: optionalEnv("TELEGRAM_CHAT_ID", ""),
    },
    coupang: {
      accessKey: optionalEnv("COUPANG_ACCESS_KEY", ""),
      secretKey: optionalEnv("COUPANG_SECRET_KEY", ""),
    },
    pipeline: {
      dailyBudgetKrw: Number(optionalEnv("DAILY_BUDGET_KRW", "2000")),
      maxPostsPerDay: Number(optionalEnv("MAX_POSTS_PER_DAY", "3")),
      maxPostsPerRun: Number(optionalEnv("MAX_POSTS_PER_RUN", "2")),
      cronSchedule: optionalEnv("CRON_SCHEDULE", "0 9,18 * * *"),
    },
  };
};
