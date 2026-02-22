import axios from "axios";
import type { Keyword, ContentBotConfig } from "../types/index.js";

interface NaverTrendResponse {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: Array<{
    title: string;
    keywords: string[];
    data: Array<{
      period: string;
      ratio: number;
    }>;
  }>;
}

const getDateRange = (): { startDate: string; endDate: string } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const format = (d: Date): string => d.toISOString().split("T")[0] ?? "";
  return { startDate: format(start), endDate: format(end) };
};

// 니치 기반 시드 키워드 — config 또는 환경변수에서 확장 가능
const SEED_KEYWORDS = [
  "AI 활용법", "ChatGPT 사용법", "AI 이미지 생성",
  "AI 코딩 도구", "AI 자동화", "AI 비서 추천",
  "AI 영상 편집", "AI 번역 도구", "AI 부업",
  "AI 학습 방법", "AI 트렌드", "AI 무료 도구",
  "Claude AI", "GPT", "Gemini AI",
];

export const fetchTrendingKeywords = async (
  config: ContentBotConfig
): Promise<Keyword[]> => {
  const { startDate, endDate } = getDateRange();

  // 키워드를 5개씩 그룹으로 나눠서 비교 (API 제한: 그룹당 최대 5개)
  const groups = Array.from(
    { length: Math.ceil(SEED_KEYWORDS.length / 5) },
    (_, i) => SEED_KEYWORDS.slice(i * 5, i * 5 + 5)
  );

  let keywords: Keyword[] = [];

  for (const group of groups) {
    try {
      const response = await axios.post<NaverTrendResponse>(
        "https://openapi.naver.com/v1/datalab/search",
        {
          startDate,
          endDate,
          timeUnit: "date",
          keywordGroups: group.map((kw) => ({
            groupName: kw,
            keywords: [kw],
          })),
        },
        {
          headers: {
            "X-Naver-Client-Id": config.naver.clientId,
            "X-Naver-Client-Secret": config.naver.clientSecret,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      const newKeywords: Keyword[] = response.data.results.reduce<Keyword[]>(
        (acc, result) => {
          const recentData = result.data.slice(-3);
          if (recentData.length === 0) return acc;
          const avgRatio =
            recentData.reduce((sum, d) => sum + d.ratio, 0) / recentData.length;
          if (avgRatio <= 10) return acc;
          return [
            ...acc,
            {
              keyword: result.title,
              source: "naver" as const,
              score: Math.round(avgRatio * 10) / 10,
              used: false,
              createdAt: new Date().toISOString(),
            },
          ];
        },
        []
      );

      keywords = [...keywords, ...newKeywords];

      // API 호출 간 딜레이 (rate limit 방지)
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Naver] API error for group: ${message}`);
    }
  }

  return keywords.sort((a, b) => b.score - a.score);
};
