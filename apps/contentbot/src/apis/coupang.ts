import crypto from "crypto";
import axios from "axios";
import type { CoupangProduct, ContentBotConfig } from "../types/index.js";

interface CoupangSearchResponse {
  rCode: string;
  rMessage: string;
  data: Array<{
    productName: string;
    productUrl: string;
    productPrice: number;
    productImage: string;
  }>;
}

const generateHmac = (
  method: string,
  url: string,
  accessKey: string,
  secretKey: string
): string => {
  const parts = new URL(url);
  const path = parts.pathname + parts.search;
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const message = `${datetime}${method}${path}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
};

export const searchCoupangProducts = async (
  config: ContentBotConfig,
  keyword: string,
  limit = 3
): Promise<CoupangProduct[]> => {
  if (!config.coupang.accessKey || !config.coupang.secretKey) {
    console.warn("[Coupang] API 키 미설정, 상품 검색 생략");
    return [];
  }

  const baseUrl = "https://api-gateway.coupang.com";
  const requestPath = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const fullUrl = `${baseUrl}${requestPath}`;

  const authorization = generateHmac(
    "GET",
    fullUrl,
    config.coupang.accessKey,
    config.coupang.secretKey
  );

  try {
    const response = await axios.get<CoupangSearchResponse>(fullUrl, {
      headers: { Authorization: authorization },
      timeout: 10000,
    });

    if (response.data.rCode !== "0") {
      console.error(
        `[Coupang] API error: ${response.data.rMessage}`
      );
      return [];
    }

    return (response.data.data ?? []).map((item) => ({
      productName: item.productName,
      productUrl: item.productUrl,
      productPrice: item.productPrice,
      imageUrl: item.productImage,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Coupang] Search error: ${message}`);
    return [];
  }
};
