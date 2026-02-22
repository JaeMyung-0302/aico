import axios from "axios";
import type { ContentBotConfig } from "../types/index.js";

export const sendTelegramMessage = async (
  config: ContentBotConfig,
  message: string
): Promise<boolean> => {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    console.warn("[Telegram] botToken 또는 chatId 미설정, 알림 생략");
    return false;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
      {
        chat_id: config.telegram.chatId,
        text: message,
        parse_mode: "Markdown",
      },
      { timeout: 10000 }
    );
    return true;
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const msg = status ? `HTTP ${status}` : "network error";
    console.error(`[Telegram] Send error: ${msg}`);
    return false;
  }
};
