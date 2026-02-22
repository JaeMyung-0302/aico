import Anthropic from "@anthropic-ai/sdk";
import type { ContentBotConfig, CoupangProduct } from "../types/index.js";

interface GeneratedContent {
  title: string;
  content: string;
  metaDescription: string;
  tokenCost: number;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isValidUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

const buildProductSection = (products: CoupangProduct[]): string => {
  if (products.length === 0) return "";

  const items = products
    .filter((p) => isValidUrl(p.productUrl))
    .map(
      (p) =>
        `<li><a href="${escapeHtml(p.productUrl)}" target="_blank" rel="noopener">${escapeHtml(p.productName)}</a> — ${p.productPrice.toLocaleString()}원</li>`
    )
    .join("\n");

  if (items.length === 0) return "";

  return `\n\n<h2>추천 AI 제품 & 도구</h2>\n<ul>\n${items}\n</ul>\n`;
};

const SYSTEM_PROMPT = `당신은 AI 전문 한국 블로거입니다.
다양한 AI 도구와 서비스를 직접 사용해보고 독자에게 친근하게 알려주는 스타일로 글을 작성하세요.

다음 규칙을 반드시 따르세요:

1. SEO 최적화: 제목에 키워드 포함, <h2>/<h3> 소제목 활용
2. 구어체 톤: "~해보니", "~더라고요", "~추천드려요" 등 자연스러운 말투
3. HTML 형식 사용 (WordPress 발행용)
4. 구조:
   - 도입: 이 AI 도구/기술을 알게 된 계기
   - 핵심 내용: <h2>/<h3>로 구분된 기능 설명 + 사용법
   - 실사용 후기: 직접 써본 경험 기반 장단점
   - 꿀팁: 실무/실생활 AI 활용 팁 2-3개
   - 마무리: 요약 및 추천 대상
5. 분량: 1,500-2,500자
6. 글 마지막에 Schema.org Article JSON-LD 마크업을 <script type="application/ld+json"> 태그로 포함

JSON 형식으로 응답하세요:
{
  "title": "SEO 최적화된 AI 블로그 제목",
  "content": "HTML 형식의 본문 전체 (Schema.org JSON-LD 포함)",
  "metaDescription": "150자 이내 메타 설명"
}`;

const MODEL_PRICING = {
  inputPricePerMToken: 3,
  outputPricePerMToken: 15,
} as const;
const USD_TO_KRW = 1350;

const parseJsonResponse = (
  raw: string
): { title: string; content: string; metaDescription: string } => {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const title = typeof parsed.title === "string" ? parsed.title : "";
    const content = typeof parsed.content === "string" ? parsed.content : "";
    const metaDescription =
      typeof parsed.metaDescription === "string"
        ? parsed.metaDescription
        : "";

    if (!title || !content) {
      throw new Error("Missing required fields: title, content");
    }

    return { title, content, metaDescription };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[Claude] JSON parse failed: ${message}. Raw: ${raw.slice(0, 200)}`
    );
  }
};

export const generateContent = async (
  config: ContentBotConfig,
  keyword: string,
  products: CoupangProduct[]
): Promise<GeneratedContent> => {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const productContext =
    products.length > 0
      ? `\n\n관련 AI 제품/도구 (본문에 자연스럽게 녹여주세요):\n${products.map((p) => `- ${p.productName} (${p.productPrice.toLocaleString()}원)`).join("\n")}`
      : "";

  const userPrompt = `키워드: "${keyword}"${productContext}\n\n위 키워드로 SEO 최적화된 AI 블로그 글을 작성해주세요.`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[Claude] API request failed: ${message}`);
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("[Claude] No text response received");
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd =
    (inputTokens * MODEL_PRICING.inputPricePerMToken) / 1_000_000 +
    (outputTokens * MODEL_PRICING.outputPricePerMToken) / 1_000_000;
  const costKrw = Math.round(costUsd * USD_TO_KRW * 100) / 100;

  const parsed = parseJsonResponse(textBlock.text);

  // Schema.org JSON-LD 검증 — 잘못된 JSON-LD는 제거
  const jsonLdMatch = parsed.content.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (jsonLdMatch?.[1]) {
    try {
      JSON.parse(jsonLdMatch[1]);
    } catch {
      console.warn("[Claude] Invalid JSON-LD in generated content, stripping");
      parsed.content = parsed.content.replace(
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
        ""
      );
    }
  }

  const productSection = buildProductSection(products);
  const fullContent = `${parsed.content}${productSection}`;

  return {
    title: parsed.title,
    content: fullContent,
    metaDescription: parsed.metaDescription,
    tokenCost: costKrw,
  };
};
