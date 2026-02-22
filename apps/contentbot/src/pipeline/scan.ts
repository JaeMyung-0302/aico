import type Database from "better-sqlite3";
import { fetchTrendingKeywords } from "../apis/naver-datalab.js";
import { fetchGoogleTrends } from "../apis/google-trends.js";
import { fetchAiNews } from "../apis/ai-news.js";
import { insertKeyword, isKeywordExists } from "../db.js";
import type { Keyword, ContentBotConfig } from "../types/index.js";

const deduplicateKeywords = (keywords: Keyword[]): Keyword[] => {
  const seen = new Set<string>();
  return keywords.filter((kw) => {
    const normalized = kw.keyword.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

export const scanTrends = async (
  config: ContentBotConfig,
  db: Database.Database
): Promise<Keyword[]> => {
  console.log("[Scanner] 트렌드 키워드 수집 시작...");

  // 세 소스에서 병렬 수집
  const [naverKeywords, googleKeywords, newsKeywords] = await Promise.all([
    fetchTrendingKeywords(config).catch((err) => {
      console.error("[Scanner] Naver 수집 실패:", err);
      return [] as Keyword[];
    }),
    fetchGoogleTrends().catch((err) => {
      console.error("[Scanner] Google 수집 실패:", err);
      return [] as Keyword[];
    }),
    fetchAiNews().catch((err) => {
      console.error("[Scanner] News 수집 실패:", err);
      return [] as Keyword[];
    }),
  ]);

  console.log(
    `[Scanner] 수집: Naver ${naverKeywords.length}개, Google ${googleKeywords.length}개, News ${newsKeywords.length}개`
  );

  // 합치기 + 중복 제거
  const allKeywords = deduplicateKeywords([
    ...naverKeywords,
    ...googleKeywords,
    ...newsKeywords,
  ]);

  // DB에서 이미 사용된 키워드 필터링
  const newKeywords = allKeywords.filter(
    (kw) => !isKeywordExists(db, kw.keyword)
  );

  console.log(
    `[Scanner] 중복 제거 후: ${allKeywords.length}개 → 신규: ${newKeywords.length}개`
  );

  // 새 키워드 DB에 저장
  const savedKeywords = newKeywords.reduce<Keyword[]>((acc, kw) => {
    try {
      const id = insertKeyword(db, {
        keyword: kw.keyword,
        source: kw.source,
        score: kw.score,
        used: false,
      });
      return [...acc, { ...kw, id }];
    } catch (error) {
      console.error(`[Scanner] 키워드 저장 실패: ${kw.keyword}`, error);
      return acc;
    }
  }, []);

  console.log(`[Scanner] DB 저장 완료: ${savedKeywords.length}개`);
  return savedKeywords;
};
